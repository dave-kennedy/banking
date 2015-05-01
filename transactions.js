var fs = require('fs'),
    mysql = require('mysql');

function Category(id, name) {
    if (!id || !name) {
        throw 'Cannot create category without ID and name';
    }

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
    if (!id || !name || !categoryID) {
        throw 'Cannot create keyword without ID, name and category ID';
    }

    this.id = id;
    this.name = name;
    this.categoryID = categoryID;
}

function Transaction(id, date, description, check, credit, debit) {
    if (!id || !date || !description) {
        throw 'Cannot create transaction without ID, date and description';
    }

    this.id = id;
    this.date = date;
    this.description = description;
    this.check = check || 'N/A';
    this.credit = credit || 0;
    this.debit = debit || 0;
}

Transaction.prototype.toString = function () {
    return 'Transaction ID: ' + this.id + '\n' +
           'Date: ' + this.date + '\n' +
           'Description: ' + this.description + '\n' +
           'Check: ' + this.check + '\n' +
           'Credit: ' + this.credit.toFixed(2) + '\n' +
           'Debit: ' + this.debit.toFixed(2) + '\n';
};

function readConfig(callback) {
    fs.readFile('config/config.json', 'utf-8', function (err, data) {
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

function displayCategories(categories, verbose) {
    categories.forEach(function (category) {
        console.log(category.toString());

        if (verbose) {
            category.transactions.forEach(function (transaction) {
                console.log(transaction.toString());
            });
        }
    });
}

function getData(connection, categoryName, fromDate, toDate) {
    var sql = 'SELECT * FROM categories ORDER BY name;' +
              'SELECT * FROM keywords ORDER BY category_id, name;' +
              'SELECT * FROM transactions ',
        where = [],
        values = [];

    if (fromDate) {
        where.push('date >= ?');
        values.push(new Date(fromDate));
    }

    if (toDate) {
        where.push('date <= ?');
        values.push(new Date(toDate));
    }

    if (where.length) {
        sql += 'WHERE ' + where.join(' AND ') + ' ';
    }

    sql += 'ORDER BY date';

    connection.connect();

    connection.query(sql, values, function (err, rows) {
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

        if (categoryName) {
            displayCategories(categories.filter(function (category) {
                return category.name.toLowerCase() == categoryName.toLowerCase();
            }), true);
        } else {
            displayCategories(categories);
        }

        connection.end();
    });
}

function addCategory(connection, categoryName) {
    if (!categoryName) {
        throw 'Cannot add category without name';
    }

    var sql = 'INSERT INTO categories SET ?';

    connection.connect();

    connection.query(sql, {name: categoryName}, function (err, result) {
        if (err) {
            throw err;
        }

        console.log('Category "' + categoryName + '" added');

        connection.end();
    });
}

function addKeyword(connection, keywordName, categoryName) {
    if (!keywordName || !categoryName) {
        throw 'Cannot add keyword without name and category name';
    }

    var sql = 'SELECT id FROM categories WHERE ?';

    connection.connect();

    connection.query(sql, {name: categoryName}, function (err, rows) {
        if (err) {
            throw err;
        }

        if (!rows.length) {
            throw 'Category "' + categoryName + '" not found';
        }

        var categoryID = rows[0].id,
            sql = 'INSERT INTO keywords SET ?';

        connection.query(sql, {name: keywordName, category_id: categoryID}, function (err, result) {
            if (err) {
                throw err;
            }

            console.log('Keyword "' + keywordName + '" added to category "' + categoryName + '"');

            connection.end();
        });
    });
}

function listCategories(connection) {
    var sql = 'SELECT * FROM categories ORDER BY name';

    connection.connect();

    connection.query(sql, function (err, rows) {
        if (err) {
            throw err;
        }

        rows.forEach(function (row) {
            console.log(row);
        });

        connection.end();
    });
}

function listKeywords(connection, categoryName) {
    var sql = 'SELECT k.id, k.name AS keyword, c.name AS category ' +
              'FROM keywords k ' +
              'JOIN categories c ON k.category_id = c.id ',
        values = [];

    if (categoryName) {
        sql += 'WHERE c.name = ? ';
        values.push(categoryName);
    }

    sql += 'ORDER BY category, keyword';

    connection.connect();

    connection.query(sql, values, function (err, rows) {
        if (err) {
            throw err;
        }

        rows.forEach(function (row) {
            console.log(row);
        });

        connection.end();
    });
}

function invoke(config) {
    var connection = createConnection(config);

    if (process.argv.indexOf('--add-category') > -1) {
        if (process.argv.indexOf('--add-keyword') > -1
            || process.argv.indexOf('--list-categories') > -1
            || process.argv.indexOf('--list-keywords') > -1
            || process.argv.indexOf('--inspect-category') > -1
            || process.argv.indexOf('--from-date') > -1
            || process.argv.indexOf('--to-date') > -1) {
            throw 'Cannot use --add-category with any other options';
        }

        return addCategory(connection, process.argv[process.argv.indexOf('--add-category') + 1]);
    }

    if (process.argv.indexOf('--add-keyword') > -1 && process.argv.indexOf('--to-category') > -1) {
        if (process.argv.indexOf('--list-categories') > -1
            || process.argv.indexOf('--list-keywords') > -1
            || process.argv.indexOf('--inspect-category') > -1
            || process.argv.indexOf('--from-date') > -1
            || process.argv.indexOf('--to-date') > -1) {
            throw 'Cannot use --add-keyword with any other options';
        }

        return addKeyword(connection,
            process.argv[process.argv.indexOf('--add-keyword') + 1],
            process.argv[process.argv.indexOf('--to-category') + 1]);
    }

    if (process.argv.indexOf('--list-categories') > -1) {
        if (process.argv.indexOf('--list-keywords') > -1
            || process.argv.indexOf('--inspect-category') > -1
            || process.argv.indexOf('--from-date') > -1
            || process.argv.indexOf('--to-date') > -1) {
            throw 'Cannot use --list-categories with any other options';
        }

        return listCategories(connection);
    }

    if (process.argv.indexOf('--list-keywords') > -1) {
        if (process.argv.indexOf('--inspect-category') > -1
            || process.argv.indexOf('--from-date') > -1
            || process.argv.indexOf('--to-date') > -1) {
            throw 'Cannot use --list-keywords with any other options';
        }

        return listKeywords(connection, process.argv[process.argv.indexOf('--list-keywords') + 1]);
    }

    getData(connection,
        process.argv.indexOf('--inspect-category') > -1 ? process.argv[process.argv.indexOf('--inspect-category') + 1] : null,
        process.argv.indexOf('--from-date') > -1 ? process.argv[process.argv.indexOf('--from-date') + 1] : null,
        process.argv.indexOf('--to-date') > -1 ? process.argv[process.argv.indexOf('--to-date') + 1] : null);
}

readConfig(invoke);

