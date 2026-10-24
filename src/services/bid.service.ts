import crypto from 'crypto';
import { LotRepository } from '../repositories/lot.repository';
import { BidRepository } from '../repositories/bid.repository';
import { UserRepository } from '../repositories/user.repository';
import { Decimal } from '@prisma/client/runtime/client';
import { Prisma } from '@prisma/client';

const lotRepository = new LotRepository();
const bidRepository = new BidRepository();
const userRepository = new UserRepository(); 

export class BidService {
  async placeBid(bidderId: string, lotId: string, amount: Decimal) {
    const lot = await lotRepository.findById(lotId);
    if (!lot) throw new Error('LOT_NOT_FOUND');

    const now = new Date();
    if (now < lot.startTime) {
      throw new Error('LOT_NOT_STARTED'); 
    }
    if (now > lot.endTime) {
      throw new Error('LOT_FINISHED'); 
    }

    const highestBid = await bidRepository.findHighestBid(lotId);
    
    const bidder = await userRepository.findById(bidderId);
    if (!bidder) throw new Error('USER_NOT_FOUND');

    this.validateTiming(lot);
    this.validateBidRules(highestBid, bidderId, amount, lot);
    this.validateFunds(bidder, amount);

    const newEndTime = this.calculateAntiSniping(lot);

    const previousLeaderId = highestBid ? highestBid.bidderId : null;
    const previousLeaderAmount = highestBid ? highestBid.amount : new Prisma.Decimal(0);

    const previousHash = highestBid ? highestBid.hash : 'GENESIS';
    
    const hash = this.generateHash(lotId, bidderId, amount, previousHash);

    await bidRepository.executeBidTransaction(
      bidderId,
      lotId,
      amount,
      previousLeaderId,
      previousLeaderAmount,
      newEndTime,
      hash,
      previousHash
    );

    return { success: true, message: 'Lance registrado com sucesso.' };
  }


  private validateTiming(lot: any) {
    const now = new Date();
    if (now < lot.startTime) throw new Error('LOT_NOT_STARTED');
    if (now > lot.endTime) throw new Error('LOT_FINISHED');
  }

  private validateBidRules(highestBid: any, bidderId: string, amount: Decimal, lot: any) {
    if (highestBid && highestBid.bidderId === bidderId) {
      throw new Error('ALREADY_WINNING');
    }

    if (highestBid) {
      const minRequired = highestBid.amount.plus(lot.minimumIncrement);
      if (amount.lessThan(minRequired)) throw new Error('BID_TOO_LOW');
    } else {
      if (amount.lessThan(lot.startingBid)) throw new Error('BID_TOO_LOW');
    }
  }

  private validateFunds(bidder: any, amount: Decimal) {
    const availableBalance = bidder.balance.minus(bidder.committedBalance);
    if (amount.greaterThan(availableBalance)) {
      throw new Error('INSUFFICIENT_FUNDS');
    }
  }

  private calculateAntiSniping(lot: any): Date | null {
    const now = new Date();
    const timeRemaining = lot.endTime.getTime() - now.getTime();
    const twoMinutesInMs = 2 * 60 * 1000;

    if (timeRemaining <= twoMinutesInMs) {
      return new Date(lot.endTime.getTime() + twoMinutesInMs);
    }
    
    return null;
  }

  private generateHash(lotId: string, bidderId: string, amount: Decimal, previousHash: string): string {
    const data = `${lotId}:${bidderId}:${new Prisma.Decimal(amount).toFixed(2)}:${previousHash}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}