import { getCustomRepository, getRepository } from 'typeorm';

import AppError from '../errors/AppError';

import Transaction, { TransactionType } from '../models/Transaction';
import Category from '../models/Category';

import TransactionsRepository from '../repositories/TransactionsRepository';

interface Request {
  title: string;
  value: number;
  type: TransactionType;
  category: string;
}

class CreateTransactionService {
  public async execute({
    title,
    value,
    type,
    category,
  }: Request): Promise<Transaction> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const categoriesRepository = getRepository(Category);

    if (!Object.values(TransactionType).includes(type)) {
      throw new AppError('This transaction type is not allowed');
    }

    const balance = await transactionsRepository.getBalance();

    if (type === TransactionType.OUTCOME && value > balance.total) {
      throw new AppError("You're not able to outcome this value");
    }

    const hasCategory = await categoriesRepository.findOne({
      where: { name: category },
    });

    let categoryId;

    if (!hasCategory) {
      const newCategory = categoriesRepository.create({
        title: category,
      });

      await categoriesRepository.save(newCategory);

      categoryId = newCategory.id;
    }

    const transaction = transactionsRepository.create({
      title,
      value,
      type,
      category_id: hasCategory ? hasCategory.id : categoryId,
    });

    await transactionsRepository.save(transaction);

    return transaction;
  }
}

export default CreateTransactionService;
