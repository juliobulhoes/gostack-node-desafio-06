import { getCustomRepository } from 'typeorm';

import AppError from '../errors/AppError';

import TransactionsRepository from '../repositories/TransactionsRepository';

interface Request {
  id: string;
}

class DeleteTransactionService {
  public async execute({ id }: Request): Promise<void> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);

    const hasTransaction = await transactionsRepository.findOne({
      where: { id },
    });

    if (!hasTransaction) {
      throw new AppError('This transaction does not exist');
    }

    await transactionsRepository.remove(hasTransaction);
  }
}

export default DeleteTransactionService;
