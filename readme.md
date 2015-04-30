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

A sample is provided to get started with, as well as sample categories and keywords. A sample config file is also provided. This file needs to be renamed to config.json and updated with the correct values.

Next, install the dependencies:

```bash
npm install
```

Finally, run the script:

```bash
node transactions.js | less
```

