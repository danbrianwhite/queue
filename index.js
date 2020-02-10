const cluster = require('cluster');
const port = 3000;

if (cluster.isMaster) {
    console.log(`Master ${process.pid} is running`);

    cluster.on('exit', function (worker, code, signal) {
        if (code === 0) {
            process.exit(0);
            return;
        }

        console.log(`worker ${worker.process.pid} died`);
        cluster.fork();
    });

    cluster.fork();
} else {
    var client = runClient();

    console.log(`Worker ${process.pid} started`);
}

function runClient() {
    const fs = require('fs');
    const express = require('express');
    const app = express();

    let increment = 1;
    let count = 0;
    let ticket = 0;
    let run = false;

    
    let data = fs.existsSync('data.json') && fs.readFileSync('data.json', 'ascii');

    if (data) {
        try {
            data = JSON.parse(data);
            count = data.count;
            ticket = data.ticket;
            increment = data.increment;
            run = data.run;

            console.log(data);
        } catch (error) {
            // ignore
        }
    }

    setInterval(function () {
        if (!run) {
            return;
        }

        if (count > ticket) {
            return;
        }
        count += increment;
        const data = {count, ticket, increment, run};
        fs.writeFileSync('data.json', JSON.stringify(data), 'ascii');

        console.log('ran ticket queue update');
        console.log(data);
    }, 1000);

    /* get the current ticket run count */
    app.get('/', function (req, res) {
        res.json({count})
    });

    /* get a new ticket number */
    app.get('/ticket', function (req, res) {
        if (count > ticket) {
            ticket = count;
        }
        ticket++;
        res.json({ticket});
        return;
    });

    /* set the increment number for speed to run queue */
    app.get('/increment/:increment', function (req, res) {
        increment = parseInt(req.params.increment);
        res.json({increment});
    });

    /* starts the queue */
    app.get('/start', function (req, res) {
        run = true;
        res.json({run});
    });

    /* stops the queue */
    app.get('/stop', function (req, res) {
        run = false;
        res.json({run});
    });

    /* stops the queue */
    app.get('/data', function (req, res) {
        const data = {count, ticket, increment, run};
        res.json(data);
    });

    /* startup the app */
    app.listen(port, function () {
        console.log(`Queue app worker listening on port ${port}!`);
    });
}
