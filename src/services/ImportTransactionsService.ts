import { getCustomRepository, getRepository, In } from 'typeorm';
import csvParse from 'csv-parse';
import path from 'path';
import fs from 'fs';
import uploadConfig from '../config/upload';

import Transaction, { TransactionType } from '../models/Transaction';
import TransactionsRepository from '../repositories/TransactionsRepository';

import Category from '../models/Category';

interface CSVTransaction {
  title: string;
  type: TransactionType;
  value: number;
  category: string;
}

interface Request {
  transactionFileName: string;
}

class ImportTransactionsService {
  async execute({ transactionFileName }: Request): Promise<Transaction[]> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const categoriesRepository = getRepository(Category);

    const csvFilePath = path.join(uploadConfig.directory, transactionFileName);

    const readCSVStream = fs.createReadStream(csvFilePath);
    const parseStream = csvParse({
      fromLine: 2,
      ltrim: true,
      rtrim: true,
    });
    const parseCSV = readCSVStream.pipe(parseStream);

    const transactions: CSVTransaction[] = [];
    const categories: string[] = [];

    parseCSV.on('data', line => {
      const [title, type, value, category] = line.map((cell: string) =>
        cell.trim(),
      );

      if (!title || !type || !value) return;

      if (!Object.values(TransactionType).includes(type)) return;

      categories.push(category);

      transactions.push({ title, type, value, category });
    });

    await new Promise(resolve => parseCSV.on('end', resolve));

    const alreadyCreatedCategories = await categoriesRepository.find({
      where: {
        title: In(categories),
      },
    });

    const alreadyCreatedCategoriesTitles = alreadyCreatedCategories.map(
      (category: Category) => category.title,
    );

    const categoriesToCreateTitles = categories
      .filter(category => !alreadyCreatedCategoriesTitles.includes(category))
      .filter(
        (value, index, categoriesToCreate) =>
          categoriesToCreate.indexOf(value) === index,
      );

    const newCategories = categoriesRepository.create(
      categoriesToCreateTitles.map(title => ({
        title,
      })),
    );

    await categoriesRepository.save(newCategories);

    const finalCategories = [...newCategories, ...alreadyCreatedCategories];

    const createdTransactions = transactionsRepository.create(
      transactions.map(transaction => ({
        title: transaction.title,
        type: transaction.type,
        value: transaction.value,
        category: finalCategories.find(
          category => category.title === transaction.category,
        ),
      })),
    );

    await transactionsRepository.save(createdTransactions);

    return createdTransactions;
  }
}

export default ImportTransactionsService;
