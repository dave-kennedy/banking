const fs = require('node:fs');

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

function getOptions() {
    const options = {};

    if (!process.argv[2]) {
        throw 'Missing name of csv file containing transaction data';
    }

    options.transactionFile = process.argv[2];

    if (!process.argv[3]) {
        throw 'Missing name of csv file containing category data';
    }

    options.categoryFile = process.argv[3];

    if (process.argv.includes('--inspect-category')) {
        options.inspectCategory = process.argv[process.argv.indexOf('--inspect-category') + 1];
    }

    if (process.argv.includes('--from-date')) {
        options.fromDate = new Date(process.argv[process.argv.indexOf('--from-date') + 1]);
    }

    if (process.argv.includes('--to-date')) {
        options.toDate = new Date(process.argv[process.argv.indexOf('--to-date') + 1]);
    }

    if (process.argv.includes('--verbose')) {
        options.verbose = true;
    }

    return options;
}

function splitLine(str) {
    if (str.startsWith('"') && str.endsWith('"')) {
        str = str.slice(1, -1);
        return str.split('","');
    }

    return str.split(',');
}

function getRows(filename, callback) {
    fs.readFile(filename, 'utf-8', (err, data) => {
        if (err) {
            throw err;
        }

        const lines = data.split('\n').filter(line => line && line != ',');
        const header = splitLine(lines.shift());

        const rows = lines.map((line, index) => {
            const row = splitLine(line);

            if (row.length != header.length) {
                throw `Columns mismatch on line ${index + 2}:\n${line}\n`;
            }

            return header.reduce((obj, column, index) => {
                obj[column] = row[index];
                return obj;
            }, {});
        });

        callback(rows);
    });
}

function getCategories(filename, callback) {
    getRows(filename, rows => {
        const categories = rows.map(row => new Category(row.Name, row.Keywords));

        if (!categories.length) {
            throw `No categories found in file ${filename}`;
        }

        callback(categories);
    });
}

function getTransactions(filename, fromDate, toDate, callback) {
    getRows(filename, rows => {
        const transactions = rows.map(row => {
            const transaction = new Transaction(row.Date, row.Name, row.Amount);

            if (fromDate && transaction.date < fromDate) {
                return null;
            }

            if (toDate && transaction.date > toDate) {
                return null;
            }

            return transaction;
        }).filter(transaction => transaction);

        if (!transactions.length) {
            throw `No transactions found in file ${filename}`;
        }

        callback(transactions);
    });
}

const options = getOptions();

getTransactions(options.transactionFile, options.fromDate, options.toDate, transactions => {
    getCategories(options.categoryFile, categories => {
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

        if (options.inspectCategory) {
            const matchingCategory = categories.find(category => {
                return category.name.toLowerCase() == options.inspectCategory.toLowerCase();
            });

            if (!matchingCategory) {
                throw `No category found named ${options.inspectCategory}`;
            }

            process.stdout.write(matchingCategory.toString());

            matchingCategory.sortTransactions().forEach(transaction => {
                process.stdout.write(transaction.toString());
            });

            return;
        }

        categories.forEach(category => {
            process.stdout.write(category.toString());

            if (options.verbose) {
                category.sortTransactions().forEach(transaction => {
                    process.stdout.write(transaction.toString());
                });
            }
        });
    });
});
