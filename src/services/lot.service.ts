import { LotRepository } from '../repositories/lot.repository';

const lotRepository = new LotRepository();

interface CreateLotDTO {
  externalItemId: string;
  startingBid: number;
  minimumIncrement: number;
  startTime: string;
  endTime: string;
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
}