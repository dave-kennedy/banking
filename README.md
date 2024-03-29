# banking

This is just a little script I use to figure out where my money goes.

## How it works

I export my banking transactions as a csv file from my bank's website, and I
maintain a list of categories in a separate csv file. Samples of these files can
be found in the data subfolder.

The transactions file should have a header row and columns for the date,
description and amount of each transaction:

```
Date,Description,Amount
1/4/2015,DEPOSIT,1000000.00
```

The categories file should have columns for the name of each category and a
pattern that matches one or more transaction descriptions:

```
Name,Pattern
Deposits,^deposit$
```

The script can then be run like so:

```sh
$ node main.js transactions.csv -c categories.csv
```

If a transaction doesn't match any of the categories, it will ask for a category
name and pattern:

```
Transaction not categorized:
Date: Tuesday, January 6, 2015
Description: DEBIT PURCHASE -VISA GOG.COM
Amount: -2.49

Please enter a category name: Games
Please enter a pattern: gog\.com
```

Once every transaction has been categorized, it will display a summary of each
category:

```
Category: Games
Total transactions: 2
Total amount: -10.48
```

## Options

### -c [FILE], --categories [FILE], --categories-file [FILE]

Default: `categories.csv`

The name of the csv file containing category data. This file is overwritten
every time the user is prompted to add or update a category. Consider making a
backup copy if it has a lot of data. If it doesn't exist, it will be created.

Example:

```sh
$ node main.js transactions.csv -c categories.csv
```

### -m [JSON], --tcols [JSON], --transaction-columns [JSON]

Default: `{"date": "Date", "description": "Description", "amount": "Amount"}`

The script expects a "Date", a "Description" and an "Amount" column in the
transactions csv file. Use this option if the columns in your file are named
otherwise.

For example, consider the following csv file:

```
Type,DateTime,Name,Amount,Balance
DEBIT,2015-01-12T10:04:16.123Z,DEBIT PURCHASE -VISA DOCTOR WHO,-40.00
```

In this case, you can specify the column names like so:

```sh
$ node main.js transactions.csv -m \
    '{"date": "DateTime", "description": "Name", "amount": "Amount"}'
```

### -n [JSON], --ccols [JSON], --category-columns [JSON]

Default: `{"name": "Name", "pattern": "Pattern"}`

The script expects a "Name" and a "Pattern" column in the categories csv
file. Use this option if the columns in your file are named otherwise.

For example, consider the following csv file:

```
Label,Color,Keywords,Tax deductible
Medical,red,(?:dr|doctor) who,true
```

In this case, you can specify the column names like so:

```sh
$ node main.js transactions.csv -n '{"name": "Label", "pattern": "Keywords"}'
```

### -o [CATEGORIES], --only [CATEGORIES], --only-categories [CATEGORIES]

Default: none

Use this option to display only the listed categories.

Example:

```sh
$ node main.js transactions.csv -o 'fast food,groceries'
```

### -f [DATE], --from [DATE], --from-date [DATE]

Default: none

Use this option to exclude transactions before this date.

Example:

```sh
$ node main.js transactions.csv -f 4/1/2016
```

### -t [DATE], --to [DATE], --to-date [DATE]

Default: none

Use this option to exclude transactions after this date.

Example:

```sh
$ node main.js transactions.csv -t 4/30/2016
```

### -v, --verbose

Default: `false`

Use this option to list the transactions in the displayed categories.

Example:

```sh
$ node main.js transactions.csv -v
```

