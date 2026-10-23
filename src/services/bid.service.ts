import crypto from 'crypto';
import { LotRepository } from '../repositories/lot.repository';
import { BidRepository } from '../repositories/bid.repository';
import { UserRepository } from '../repositories/user.repository';

const lotRepository = new LotRepository();
const bidRepository = new BidRepository();
const userRepository = new UserRepository(); 

export class BidService {
  async placeBid(bidderId: string, lotId: string, amount: number) {
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
    const previousLeaderAmount = highestBid ? highestBid.amount : 0;

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

  private validateBidRules(highestBid: any, bidderId: string, amount: number, lot: any) {
    if (highestBid && highestBid.bidderId === bidderId) {
      throw new Error('ALREADY_WINNING');
    }

    if (highestBid) {
      const minRequired = highestBid.amount + lot.minimumIncrement;
      if (amount < minRequired) throw new Error('BID_TOO_LOW');
    } else {
      if (amount < lot.startingBid) throw new Error('BID_TOO_LOW');
    }
  }

  private validateFunds(bidder: any, amount: number) {
    const availableBalance = bidder.balance - bidder.committedBalance;
    if (amount > availableBalance) {
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

  private generateHash(lotId: string, bidderId: string, amount: number, previousHash: string): string {
    const data = `${lotId}:${bidderId}:${amount}:${previousHash}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}