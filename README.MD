This is a convinience application for fetching and distributing banking data from
Bunq application (more banks in the future). Currently the only way to fetch
the transaction data is by providing the api key in the .env file. In the future
it will be possible to do the same with 0auth.

Giving the api key to the third-party application is scary and not recommended.
This application has been primarely built for personal use case of extedning functionality
and analysy of the Bunq application with custom web and desktop local solutions.

When this application is run it will fetch transaction data from the bunq server and
start the service on your machine that will provide all transaction data via one of the
following ways:
  + http rest service - under construction

  TO DO:
  + socket based service
  + encrypted shared memory
  + redis
  + sqlite database
  + custom callback to be called on each transaction

Configuration file will be added that will allow settings control
For example refresh interval, notification script injection, etc...

Make sure to run deno test/main script with following flags\
`--allow-all --env-file=.env`
