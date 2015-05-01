This is just a little script I use to figure out where my money goes.

I export my banking transactions as a csv file from my bank's website, and I maintain a list of categories in a separate csv file. Samples of these files can be found in the data subfolder.

The transactions file should have columns for the date, amount and name of each transaction, and a header row:

```
"Date","Name","Amount"
"1/4/2015","DEPOSIT","1000000.00"
```

The categories file should have columns for the name of each category and a list of matching keywords as a regular expression:

```
"Name","Keywords"
"Deposits","^deposit$"
```

The script can then be run like so:

```bash
$ node transactions.js data/transactions.csv data/categories.csv
```

If a transaction doesn't match any of the categories, the script will throw an exception:

```bash
Transaction not categorized:
Date: Tuesday, January 6, 2015
Description: DEBIT PURCHASE -VISA GOG.COM
Amount: -2.49
```

Knowing this was a games purchase, I can add a category to the categories file:

```
"Games","gog\.com|steamgames\.com"
```

Once every transaction has been categorized, the script will print out a summary of each category to the console:

```bash
Category: Games
Keywords: gog\.com, steamgames\.com
Total transactions: 2
Total amount: -4.98
```

Use the `--inspect-category` option, followed by the name of a category, to see the transactions in that category. A date range can be specified with the `--from-date` and `--to-date` options.

