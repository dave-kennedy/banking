var fs = require('fs');

function Category(name, keywords) {
    if (!name || !keywords) {
        throw 'Cannot create category without name and keywords';
    }

    this.name = name;
    this.keywords = new RegExp(keywords, 'i');
    this.transactions = [];
    this.totalTransactions = 0;
    this.totalAmount = 0;
}

Category.prototype.addTransaction = function (transaction) {
    this.transactions.push(transaction);
    this.totalTransactions++;
    this.totalAmount += transaction.amount;
};

Category.prototype.matchTransaction = function (transaction) {
    return this.keywords.test(transaction.description);
};

Category.prototype.toString = function (verbose) {
    var output = 'Category: ' + this.name + '\n' +
                 'Keywords: ' + this.keywords.source.replace(/\|/g, ', ') + '\n' +
                 'Total transactions: ' +  this.totalTransactions + '\n' +
                 'Total amount: ' + this.totalAmount.toFixed(2) + '\n\n';

    if (verbose) {
        this.transactions.sort(function (transactionA, transactionB) {
            if (transactionA.date < transactionB.date) {
                return -1;
            }

            if (transactionA.date > transactionB.date) {
                return 1;
            }

            return 0;
        }).forEach(function (transaction) {
            output += transaction.toString();
        });
    }

    return output;
};

function Transaction(date, description, amount) {
    if (!date || !description || !amount) {
        throw 'Cannot create transaction without date, description and amount';
    }

    this.date = new Date(date);
    this.description = description.trim();
    this.amount = parseFloat(amount);
}

Transaction.prototype.toString = function () {
    return 'Date: ' + this.date.toLocaleDateString() + '\n' +
           'Description: ' + this.description + '\n' +
           'Amount: ' + this.amount.toFixed(2) + '\n\n';
};

function getOptions() {
    var options = {};

    if (!process.argv[2]) {
        throw 'Missing name of csv file containing transaction data';
    }

    options.transactionFile = process.argv[2];

    if (!process.argv[3]) {
        throw 'Missing name of csv file containing category data';
    }

    options.categoryFile = process.argv[3];

    if (process.argv.indexOf('--inspect-category') > -1) {
        options.inspectCategory = process.argv[process.argv.indexOf('--inspect-category') + 1];
    }

    if (process.argv.indexOf('--from-date') > -1) {
        options.fromDate = new Date(process.argv[process.argv.indexOf('--from-date') + 1]);
    }

    if (process.argv.indexOf('--to-date') > -1) {
        options.toDate = new Date(process.argv[process.argv.indexOf('--to-date') + 1]);
    }

    return options;
}

function isNotEmpty(str) {
    return str && str != ',';
}

function getData(filename, callback) {
    fs.readFile(filename, 'utf-8', function (err, data) {
        if (err) {
            throw err;
        }

        var lines = data.split('\n').filter(isNotEmpty),
            header = lines.shift(),
            columns = header.split('"').filter(isNotEmpty),
            rows = lines.map(function (line, index) {
                var row = line.split('"').filter(isNotEmpty);

                if (row.length != columns.length) {
                    throw 'Columns mismatch on line ' + (index + 2) + ':\n' + line + '\n';
                }

                return row;
            }),
            objects = rows.map(function (row) {
                var obj = {};

                columns.forEach(function (column, index) {
                    obj[column] = row[index];
                });

                return obj;
            });

        callback(objects);
    });
}

function displayCategories(categories, verbose) {
    categories.forEach(function (category) {
        process.stdout.write(category.toString(verbose));
    });
}

(function () {
    var options = getOptions();

    getData(options.transactionFile, function (transactions) {
        transactions = transactions.map(function (transaction) {
            return new Transaction(transaction.Date, transaction.Name, transaction.Amount);
        });

        if (options.fromDate || options.toDate) {
            transactions = transactions.filter(function (transaction) {
                if (options.fromDate && transaction.date < options.fromDate) {
                    return false;
                }

                if (options.toDate && transaction.date > options.toDate) {
                    return false;
                }

                return true;
            });
        }

        getData(options.categoryFile, function (categories) {
            categories = categories.map(function (category) {
                return new Category(category.Name, category.Keywords);
            });

            transactions.forEach(function (transaction) {
                for (var c = 0; c < categories.length; c++) {
                    category = categories[c];

                    if (category.matchTransaction(transaction)) {
                        return category.addTransaction(transaction);
                    }
                }

                throw 'Transaction not categorized:\n' + transaction.toString();
            });

            if (options.inspectCategory) {
                categories = categories.filter(function (category) {
                    return category.name.toLowerCase() == options.inspectCategory.toLowerCase();
                });

                return displayCategories(categories, true);
            }

            displayCategories(categories);
        });
    });
}());

