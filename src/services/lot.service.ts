import { prisma } from '../config/database';
import { BidRepository } from '../repositories/bid.repository';
import { LotRepository } from '../repositories/lot.repository';
import { UserRepository } from '../repositories/user.repository';

const lotRepository = new LotRepository();
const bidRepository = new BidRepository();
const userRepository = new UserRepository();

interface CreateLotDTO {
  externalItemId: string;
  startingBid: number;
  minimumIncrement: number;
  startTime: string;
  endTime: string;
}

function maskBidderName(name?: string): string {
  if (!name) return 'Licitante Anônimo';
  const parts = name.trim().split(' ');
  const firstName = parts[0];
  const lastName = parts[1];

  if (lastName) {
    return `${firstName} ${lastName.charAt(0)}.`;
  }
  return `${name.substring(0, 3)}***`;
}

export class LotService {
  async createLot(creatorId: string, data: CreateLotDTO) {
    const { externalItemId, startingBid, minimumIncrement, startTime, endTime } = data;

    if (!externalItemId || !startingBid || !minimumIncrement || !startTime || !endTime) {
      throw new Error('FIELDS_MISSING');
    }

    let metData;
    try {
      const response = await fetch(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${externalItemId}`);
      
      if (!response.ok) {
        throw new Error('API_ERROR');
      }
      
      metData = await response.json();

      if (!metData || !metData.title) {
        throw new Error('ITEM_NOT_FOUND');
      }
    } catch (error: any) {
      if (error.message === 'ITEM_NOT_FOUND') {
        throw new Error('ITEM_NOT_FOUND');
      }
      throw new Error('EXTERNAL_API_UNAVAILABLE'); 
    }

    const imageUrl = metData.primaryImageSmall || metData.primaryImage || '';
    const title = metData.title;

    const newLot = await lotRepository.create({
      externalItemId: String(externalItemId),
      title,
      imageUrl,
      startingBid: Number(startingBid),
      minimumIncrement: Number(minimumIncrement),
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      creatorId,
    });

    return newLot;
  }

  async cancelLot(creatorId: string, lotId: string) {
    const lot = await lotRepository.findById(lotId);

    if (!lot) {
      throw new Error('LOT_NOT_FOUND');
    }

    if (lot.creatorId !== creatorId) {
      throw new Error('UNAUTHORIZED');
    }

    // Impede o cancelamento se já houver lances
    if (lot._count.bids > 0) {
      throw new Error('HAS_BIDS');
    }

    await lotRepository.delete(lotId);
    return true;
  }

  async listLots(status?: string) {
    return await lotRepository.findAll(status);
  }

  async getLotById(lotId: string) {
    const lot = await lotRepository.findWithDetails(lotId);
    if (!lot) {
      throw new Error('LOT_NOT_FOUND');
    }
    return lot;
  }

  async searchExternalItems(query: string) {
    if (!query) {
      throw new Error('QUERY_REQUIRED');
    }

    try {
      const response = await fetch(`https://collectionapi.metmuseum.org/public/collection/v1.1/search?q=${encodeURIComponent(query)}`);
      
      if (!response.ok) {
        throw new Error('API_ERROR');
      }

      const data = await response.json();
      const objectIDs: number[] = data.objectIDs || [];

      const limitedIDs = objectIDs.slice(0, 10);

      const items = await Promise.all(
        limitedIDs.map(async (id) => {
          try {
            const objRes = await fetch(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`);
            if (!objRes.ok) return null;
            const objData = await objRes.json();
            return {
              objectID: objData.objectID,
              title: objData.title,
              primaryImageSmall: objData.primaryImageSmall || objData.primaryImage || '',
              artistDisplayName: objData.artistDisplayName || 'Desconhecido',
              objectDate: objData.objectDate || '',
            };
          } catch {
            return null;
          }
        })
      );

      return items.filter(Boolean);
    } catch (error: any) {
      throw new Error('EXTERNAL_API_UNAVAILABLE');
    }
  }

  async listMyLots(creatorId: string) {
    return await lotRepository.findByCreatorId(creatorId);
  }

  async liquidateLot(lotId: string) {
    const lot = await lotRepository.findById(lotId);
    if (!lot) throw new Error('LOT_NOT_FOUND');

    if (lot.status === 'FINISHED' || lot.status === 'CANCELLED') {
      throw new Error('LOT_ALREADY_CLOSED');
    }

    // Valida se o tempo do leilão realmente já acabou
    const now = new Date();
    if (now < lot.endTime) {
      throw new Error('LOT_NOT_YET_FINISHED');
    }

    // Busca o lance vencedor (o maior lance)
    const highestBid = await bidRepository.findHighestBid(lotId);

    if (highestBid) {
      await lotRepository.closeLotWithWinner(
        lotId,
        highestBid.bidderId,
        highestBid.amount,
        lot.creatorId
      );

      return {
        message: 'Lote liquidado com sucesso.',
        winnerId: highestBid.bidderId,
        winningAmount: highestBid.amount,
        receipt: {
          lotId: lot.id,
          title: lot.title,
          amount: highestBid.amount,
          closedAt: new Date(),
        },
      };
    } else {
      await lotRepository.closeLotWithoutWinner(lotId);
      return {
        message: 'Lote encerrado sem lances (sem vencedor).',
        winnerId: null,
        winningAmount: 0,
      };
    }
  }

  async getLiveRoomData(lotId: string, currentUserId?: string) {
    // 1. Busca o lote e os lances básicos (que só têm bidderId)
    const lot = await lotRepository.findById(lotId);
    if (!lot) throw new Error('LOT_NOT_FOUND');

    const highestBid = await bidRepository.findHighestBid(lotId);
    const allBids = await bidRepository.findByLotId(lotId);

    // 2. Extrai todos os IDs únicos de usuários que deram lance nesse lote
    const bidderIds = Array.from(new Set(allBids.map(b => b.bidderId)));
    if (highestBid) bidderIds.push(highestBid.bidderId);

    // 3. Busca todos esses usuários de uma só vez usando o UserRepository
    const users = await userRepository.findByIds(bidderIds); 
    const userMap = new Map(users.map(u => [u.id, u]));

    // 4. Faz o cruzamento em memória (sem tocar no schema do banco)
    const isWinning = highestBid ? highestBid.bidderId === currentUserId : false;

    const formattedBids = allBids.map(bid => {
      const bidder = userMap.get(bid.bidderId);
      return {
        id: bid.id,
        amount: bid.amount,
        createdAt: bid.createdAt,
        bidderName: maskBidderName(bidder?.name || ''),
        isUserBid: currentUserId ? bid.bidderId === currentUserId : false,
      };
    });

    return {
      serverTime: new Date(),
      lot: {
        id: lot.id,
        title: lot.title,
        imageUrl: lot.imageUrl,
        startingBid: lot.startingBid,
        minimumIncrement: lot.minimumIncrement,
        startTime: lot.startTime,
        endTime: lot.endTime,
        status: lot.status,
      },
      currentLeader: highestBid ? {
        amount: highestBid.amount,
        bidderName: maskBidderName(userMap.get(highestBid.bidderId)?.name || ''),
      } : null,
      userStatus: {
        isWinning,
      },
      bidsHistory: formattedBids,
    };
  }
}