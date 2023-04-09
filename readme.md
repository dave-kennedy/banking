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

The categories file should have columns for the name of each category and a list
of matching keywords as a regular expression:

```
Name,Keywords
Deposits,^deposit$
```

The script can then be run like so:

```sh
$ node main.js data/transactions.csv data/categories.csv
```

If a transaction doesn't match any of the categories, it will ask for a category
name and keywords:

```
Transaction not categorized:
Date: Tuesday, January 6, 2015
Description: DEBIT PURCHASE -VISA GOG.COM
Amount: -2.49

Please enter a category name: Games
Please enter keywords: gog\.com
```

Once every transaction has been categorized, it will display a summary of each
category:

```
Category: Games
Keywords: steamgames\.com, gog\.com
Total transactions: 2
Total amount: -10.48
```

## Options

### --transaction-columns [JSON]

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
$ node main.js ... --transaction-columns \
    '{"date": "DateTime", "description": "Name", "amount": "Amount"}'
```

### --category-columns [JSON]

Default: `{"name": "Name", "keywords": "Keywords"}`

The script expects a "Name" and a "Keywords" column in the categories csv
file. Use this option if the columns in your file are named otherwise.

For example, consider the following csv file:

```
Label,Color,Pattern,Tax deductible
Medical,red,(?:dr|doctor) who,true
```

In this case, you can specify the column names like so:

```sh
$ node main.js ... --category-columns '{"Name": "Label", "Keywords": "Pattern"}'
```

### --only-categories [CATEGORIES]

Default: none

Use this option to display only the listed categories.

Example:

```sh
$ node main.js ... --only-categories 'fast food,groceries'
```

### --from-date [DATE]

Default: none

Use this option to exclude transactions before this date.

Example:

```sh
$ node main.js ... --from-date 4/1/2016
```

### --to-date [DATE]

Default: none

Use this option to exclude transactions after this date.

Example:

```sh
$ node main.js ... --from-date 4/30/2016
```

### --verbose

Default: false

Use this option to list the transactions in the displayed categories.

Example:

```sh
$ node main.js ... --verbose
```

