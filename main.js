const fs = require('node:fs');

const csv = require('csv-parse/sync');
const prompt = require('prompt-sync')({sigint: true});

class Category {
    name;
    pattern;
    transactions;
    totalTransactions;
    totalAmount;

    constructor(name, pattern) {
        if (!name || !pattern) {
            throw 'Cannot create category without name and pattern';
        }

        this.name = name;
        this.pattern = new RegExp(pattern, 'i');
        this.transactions = [];
        this.totalTransactions = 0;
        this.totalAmount = 0;
    }

    addPattern(pattern) {
        this.pattern = new RegExp([this.pattern.source, pattern].join('|'), 'i');
    }

    addTransaction(transaction) {
        this.transactions.push(transaction);
        this.totalTransactions++;
        this.totalAmount += transaction.amount;
    }

    matchTransaction(transaction) {
        return this.pattern.test(transaction.description);
    }

    toString() {
        return `Category: ${this.name}\n` +
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
            if (err?.code == 'ENOENT') {
                callback([]);
                return;
            }

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
    getRows(options.categoriesFile, rows => {
        const categories = rows.map(row => {
            return new Category(
                row[options.categoryColumns.name],
                row[options.categoryColumns.pattern]
            );
        });

        callback(categories);
    });
}

function getTransactions(options, callback) {
    getRows(options.transactionsFile, rows => {
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
            throw `No transactions found in file ${options.transactionsFile}`;
        }

        callback(transactions);
    });
}

function saveCategories(options, categories) {
    const data = `${options.categoryColumns.name},${options.categoryColumns.pattern}\n` +
        categories.map(category => `${category.name},${category.pattern.source}`).join('\n');

    fs.writeFileSync(options.categoriesFile, data, 'utf-8', err => {
        if (err) {
            throw err;
        }
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

    let optIndex;

    if (name instanceof Array) {
        optIndex = args.findLastIndex(arg => name.includes(arg));
    } else {
        optIndex = args.indexOf(name);
    }

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
    transactionsFile: parseOption({
        index: 0,
        description: 'name of csv file containing transaction data'
    }),
    categoriesFile: parseOption({
        name: ['-c', '--categories', '--categories-file'],
        defaultValue: 'categories.csv'
    }),
    transactionColumns: parseOption({
        name: ['-m', '--tcols', '--transaction-columns'],
        type: 'json',
        defaultValue: {date: 'Date', description: 'Description', amount: 'Amount'}
    }),
    categoryColumns: parseOption({
        name: ['-n', '--ccols', '--category-columns'],
        type: 'json',
        defaultValue: {name: 'Name', pattern: 'Pattern'}
    }),
    onlyCategories: parseOption({
        name: ['-o', '--only', '--only-categories'],
        type: 'array'
    }),
    fromDate: parseOption({
        name: ['-f', '--from', '--from-date'],
        type: 'date'
    }),
    toDate: parseOption({
        name: ['-t', '--to', '--to-date'],
        type: 'date'
    }),
    verbose: parseOption({
        name: ['-v', '--verbose'],
        type: 'boolean'
    })
};

getTransactions(options, transactions => {
    getCategories(options, categories => {
        transactions.forEach(transaction => {
            const matchingCategories = categories.filter(category => {
                return category.matchTransaction(transaction);
            });

            if (matchingCategories.length > 1) {
                throw `Transaction matches multiple categories:\n${transaction}`;
            }

            if (matchingCategories.length == 1) {
                matchingCategories[0].addTransaction(transaction);
                return;
            }

            process.stdout.write(`Transaction not categorized:\n${transaction}`);

            const newName = prompt('Please enter a category name: ');
            const newPattern = prompt('Please enter pattern: ');

            process.stdout.write('\n' + '-'.repeat(process.stdout.columns) + '\n\n');

            const category = categories.find(category =>
                category.name.toLowerCase() === newName.toLowerCase()
            );

            if (category) {
                category.addPattern(newPattern);
                category.addTransaction(transaction);
                saveCategories(options, categories);
                return;
            }

            const newCategory = new Category(newName, newPattern);
            newCategory.addTransaction(transaction);
            categories.push(newCategory);
            saveCategories(options, categories);
        });

        const onlyCategories = options.onlyCategories?.map(category => category.toLowerCase());

        categories.sort((categoryA, categoryB) => {
            return categoryA.name.localeCompare(categoryB.name);
        }).filter(category => {
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

