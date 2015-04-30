var fs = require('fs'),
    mysql = require('mysql');

function Category(id, name) {
    this.id = id;
    this.name = name;
    this.keywords = [];
    this.transactions = [];
    this.regexp = null;
    this.totalTransactions = 0;
    this.totalDebits = 0;
    this.totalCredits = 0;
}

Category.prototype.addKeyword = function (keyword) {
    this.keywords.push(keyword);
    this.regexp = new RegExp(this.getKeywords('|'), 'i');
};

Category.prototype.addTransaction = function (transaction) {
    this.transactions.push(transaction);
    this.totalTransactions++;
    this.totalDebits += transaction.debit;
    this.totalCredits += transaction.credit;
};

Category.prototype.hasKeyword = function (keyword) {
    return this.id == keyword.categoryID;
};

Category.prototype.getKeywords = function (separator) {
    return this.keywords.map(function (keyword) {
        return keyword.name;
    }).join(separator);
};

Category.prototype.matchTransaction = function (transaction) {
    return this.regexp.test(transaction.description);
};

Category.prototype.toString = function () {
    return 'Category ID: ' + this.id + '\n' +
           'Name: ' + this.name + '\n' +
           'Keywords: ' + this.getKeywords(', ') + '\n' +
           'Total transactions: ' +  this.totalTransactions + '\n' +
           'Total debits: ' + this.totalDebits.toFixed(2) + '\n' +
           'Total credits: ' + this.totalCredits.toFixed(2) + '\n';
};

function Keyword(id, name, categoryID) {
    this.id = id;
    this.name = name;
    this.categoryID = categoryID;
}

function Transaction(id, date, description, check, credit, debit) {
    this.id = id;
    this.date = date;
    this.description = description;
    this.check = check;
    this.credit = credit;
    this.debit = debit;
}

Transaction.prototype.toString = function () {
    return 'Transaction ID: ' + this.id + '\n' +
           'Date: ' + this.date + '\n' +
           'Description: ' + this.description + '\n' +
           'Check: ' + this.check + '\n' +
           'Credit: ' + this.credit + '\n' +
           'Debit: ' + this.debit + '\n';
};

function readConfig(callback) {
    fs.readFile('config.json', 'utf-8', function (err, data) {
        if (err) {
            throw err;
        }

        var config = JSON.parse(data);

        callback(config);
    });
}

function createConnection(config) {
    return mysql.createConnection({
        host: config.host,
        user: config.user,
        password: config.password,
        database: config.database,
        multipleStatements: true
    });
}

function getData(config) {
    var connection = createConnection(config),
        sql = 'SELECT * FROM categories ORDER BY id;' +
              'SELECT * FROM keywords ORDER BY category_id, id;' +
              'SELECT * FROM transactions ORDER BY id';

    connection.connect();

    connection.query(sql, function (err, rows) {
        if (err) {
            throw err;
        }

        var categoryRows = rows[0],
            keywordRows = rows[1],
            transactionRows = rows[2];

        var categories = categoryRows.map(function (row) {
            return new Category(row.id, row.name);
        });

        var keywords = keywordRows.map(function (row) {
            return new Keyword(row.id, row.name, row.category_id);
        });

        keywords.forEach(function (keyword) {
            for (var c = 0; c < categories.length; c++) {
                category = categories[c];

                if (category.hasKeyword(keyword)) {
                    return category.addKeyword(keyword);
                }
            }
        });

        var transactions = transactionRows.map(function (row) {
            return new Transaction(row.id, row.date, row.description, row.check, row.credit, row.debit);
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

        categories.forEach(function (category) {
            console.log(category.toString());
        });

        connection.end();
    });
}

readConfig(getData);

