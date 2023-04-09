const fs = require('node:fs');

const csv = require('csv-parse/sync');

class Category {
    name;
    keywords;
    transactions;
    totalTransactions;
    totalAmount;

    constructor(name, keywords) {
        if (!name || !keywords) {
            throw 'Cannot create category without name and keywords';
        }

        this.name = name;
        this.keywords = new RegExp(keywords, 'i');
        this.transactions = [];
        this.totalTransactions = 0;
        this.totalAmount = 0;
    }

    addTransaction(transaction) {
        this.transactions.push(transaction);
        this.totalTransactions++;
        this.totalAmount += transaction.amount;
    }

    matchTransaction(transaction) {
        return this.keywords.test(transaction.description);
    }

    toString() {
        return `Category: ${this.name}\n` +
            `Keywords: ${this.keywords.source.replace(/\|/g, ', ')}\n` +
            `Total transactions: ${this.totalTransactions}\n` +
            `Total amount: ${this.totalAmount.toFixed(2)}\n\n`;
    }

    sortTransactions() {
        return this.transactions.sort((transactionA, transactionB) => {
            if (transactionA.date < transactionB.date) {
                return -1;
            }

            if (transactionA.date > transactionB.date) {
                return 1;
            }

            return 0;
        });
    }
}

class Transaction {
    date;
    description;
    amount;

    constructor(date, description, amount) {
        if (!date || !description || !amount) {
            throw 'Cannot create transaction without date, description and amount';
        }

        this.date = new Date(date);
        this.description = description.trim();
        this.amount = parseFloat(amount);
    }

    toString() {
        return `Date: ${this.date.toLocaleDateString()}\n` +
            `Description: ${this.description}\n` +
            `Amount: ${this.amount.toFixed(2)}\n\n`;
    }
}

function getRows(filename, callback) {
    fs.readFile(filename, 'utf-8', (err, data) => {
        if (err) {
            throw err;
        }

        const records = csv.parse(data, {
            columns: true,
            relax_quotes: true,
            skip_empty_lines: true
        });

        callback(records);
    });
}

function getCategories(options, callback) {
    getRows(options.categoryFile, rows => {
        const categories = rows.map(row => {
            return new Category(
                row[options.categoryColumns.name],
                row[options.categoryColumns.keywords]
            );
        });

        if (!categories.length) {
            throw `No categories found in file ${options.categoryFile}`;
        }

        callback(categories);
    });
}

function getTransactions(options, callback) {
    getRows(options.transactionFile, rows => {
        const transactions = rows.map(row => {
            const transaction = new Transaction(
                row[options.transactionColumns.date],
                row[options.transactionColumns.description],
                row[options.transactionColumns.amount]
            );

            if (options.fromDate && transaction.date < options.fromDate) {
                return null;
            }

            if (options.toDate && transaction.date > options.toDate) {
                return null;
            }

            return transaction;
        }).filter(transaction => transaction);

        if (!transactions.length) {
            throw `No transactions found in file ${options.transactionFile}`;
        }

        callback(transactions);
    });
}

function parseOption({index, name, description, type, defaultValue}) {
    const args = process.argv.slice(2);

    if (typeof index == 'number') {
        if (!args[index] || !args[index].trim()) {
            throw `Missing ${description}`;
        }

        return args[index];
    }

    const optIndex = args.indexOf(name);

    if (optIndex == -1) {
        return defaultValue;
    }

    if (type == 'boolean') {
        return true;
    }

    if (args.length < optIndex + 2 || !args[optIndex + 1].trim()) {
        throw `Missing value for ${name}`;
    }

    if (type == 'array') {
        return args[optIndex + 1].split(',');
    }

    if (type == 'date') {
        return new Date(args[optIndex + 1]);
    }

    if (type == 'json') {
        return JSON.parse(args[optIndex + 1]);
    }

    return args[optIndex + 1];
}

const options = {
    transactionFile: parseOption({
        index: 0,
        description: 'name of csv file containing transaction data'
    }),
    categoryFile: parseOption({
        index: 1,
        description: 'name of csv file containing category data'
    }),
    transactionColumns: parseOption({
        name: '--transaction-columns',
        type: 'json',
        defaultValue: {date: 'Date', description: 'Description', amount: 'Amount'}
    }),
    categoryColumns: parseOption({
        name: '--category-columns',
        type: 'json',
        defaultValue: {name: 'Name', keywords: 'Keywords'}
    }),
    onlyCategories: parseOption({name: '--only-categories', type: 'array'}),
    fromDate: parseOption({name: '--from-date', type: 'date'}),
    toDate: parseOption({name: '--to-date', type: 'date'}),
    verbose: parseOption({name: '--verbose', type: 'boolean'})
};

getTransactions(options, transactions => {
    getCategories(options, categories => {
        transactions.forEach(transaction => {
            const matchingCategories = categories.filter(category => {
                return category.matchTransaction(transaction);
            });

            if (!matchingCategories.length) {
                throw `Transaction not categorized:\n${transaction}`;
            }

            if (matchingCategories.length > 1) {
                throw `Transaction matches multiple categories:\n${transaction}`;
            }

            matchingCategories[0].addTransaction(transaction);
        });

        const onlyCategories = options.onlyCategories?.map(category => category.toLowerCase());

        categories.filter(category => {
            return !onlyCategories || onlyCategories.includes(category.name.toLowerCase());
        }).forEach(category => {
            process.stdout.write(category.toString());

            if (options.verbose) {
                category.sortTransactions().forEach(transaction => {
                    process.stdout.write(transaction.toString());
                });
            }
        });
    });
});

