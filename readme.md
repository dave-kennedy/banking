This is just a little script I use to figure out where my money goes.

First, create the database and schema:

```bash
mysql> create database banking;
mysql> use banking;
mysql> source '/path/to/schema.sql';
```

To get data into the database, I export my banking transactions as a csv file from my bank's website. Then I import it in mysql (after starting the mysql shell with `--local-infile`):

```bash
mysql> load data local infile '/path/to/transactions.csv' into table transactions fields terminated by ',' enclosed by '"' lines terminated by '\n' (date, description, `check`, credit, debit);
```

A sample is provided to get started with (in the data subfolder), as well as sample categories and keywords. A sample config file is also provided (in the config subfolder). This file needs to be renamed to config.json and updated with the correct values.

Next, install the dependencies:

```bash
$ npm install
```

Finally, run the script:

```bash
$ node transactions.js
```

If a transaction doesn't match any of the keywords, the script will throw an exception. For example:

```bash
Transaction not categorized:
Transaction ID: 300
Date: Wed Apr 16 2014 00:00:00
Description: Debit Purchase -visa Amazon Mktplace Amzn.com
Check: N/A
Credit: 0.00
Debit: 30.42
```

Knowing this was an electronics purchase, I can add a category like so:

```bash
$ node transactions.js --add-category "Electronics"
```

Then I can add a keyword:

```bash
$ node transactions.js --add-keyword "amzn\.com" --to-category "electronics"
```

The keywords are matched by regular expression, so special characters have to be escaped.

Once every transaction has been categorized, the script will print out a summary of each category to the console:

```bash
Category ID: 10
Name: Electronics
Keywords: amzn\.com
Total transactions: 1
Total debits: 30.42
Total credits: 0.00
```

Use the `--inspect-category` option, followed by the name of a category, to see the detailed output. `--list-categories` will list categories and `--list-keywords` will list keywords.

