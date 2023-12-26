const mqtt = require('mqtt');
const moment=require('moment');

const mqttConfig = {
    username: 'emqx',
    password: 'public',
    qos: 2,
    connectTimeout: 4000,
    reconnectPeriod: 1000,
    clean: true
}

mqttConfig.clientId = 'DMFM_D2' + Date.now(); // publisher client

const devID = 'INEM_DEMO';
const topic = `devicesIn/${devID}/data`;

const host = 'broker.emqx.io';
const port = 1883;

const max = 100;
const min = 10;

const connectURL = `mqtt://${host}:${port}`;

const client = mqtt.connect(connectURL, mqttConfig);

// const publishInterval=(Math.floor(Math.random() * (5 - 1 + 1) + 1))*1000;

// timeout: (Math.floor(Math.random() * (5 - 1 + 1) + 1))*1000,

function publishData() {
    // console.log((Math.floor(Math.random() * (5 - 1 + 1) + 1))*1000);
    const interval = setInterval(() => {
        /** Publish on mqtt every second */
        console.log('Publishing ', devID, ' data...');
        const random = (Math.random() * (max - min)) + min;
        const random2 = (Math.random() * (max - min)) + min;
        const random3 = (Math.random() * (max - min)) + min;
        // console.log('Random number', random);

        const currentHour = moment().get('hour'); // should be either 5(10:30 am in IST) or 12 (5:30 pm in IST) publish low VOLTS1 value
        // console.log(Date.now());
        const dataPacket = {
            device: devID,
            time: Date.now(),
            data: [{
                tag: 'ENERGY',
                value: random3
            },
            {
                tag: 'ACTIVE',
                value: random
            },
            {
                tag: 'CUR1',
                value: random2
            },
            {
                tag: 'CUR2',
                value: random3
            },
            {
                tag: 'CUR3',
                value: random
            },
            {
                tag: 'FREQ',
                value: random3
            },
            {
                tag: 'MD',
                value: random2
            },
            {
                tag: 'MDKW',
                value: random3
            },
            {
                tag: 'PF1',
                value: random
            },
            {
                tag: 'PF2',
                value: random2
            },
            {
                tag: 'PF3',
                value: random3
            },
            {
                tag: 'PFAVG',
                value: random2
            },
            {
                tag: 'REACTIVE',
                value: random
            },
            {
                tag: 'VOLTS1',
                value: random3
            }, {
                tag: 'VOLTS2',
                value: random2
            }, {
                tag: 'VOLTS3',
                value: random
            }, {
                tag: 'W1',
                value: random3
            }, {
                tag: 'W2',
                value: random2
            }, {
                tag: 'W3',
                value: random
            }, {
                tag: 'D18',
                value: random2
            }, {
                tag: 'D19',
                value: random3
            }, {
                tag: 'D20',
                value: random2
            }, {
                tag: 'D21',
                value: random
            }, {
                tag: 'D22',
                value: random2
            }, {
                tag: 'D23',
                value: random3
            }, {
                tag: 'D24',
                value: random2
            }, {
                tag: 'D25',
                value: random
            }, {
                tag: 'D26',
                value: random2
            }, {
                tag: 'D27',
                value: random3
            }, {
                tag: 'D28',
                value: random2
            }, {
                tag: 'D29',
                value: random2
            },
            {
                tag: 'D30',
                value: random
            },
            {
                tag: 'D31',
                value: random2
            },

            {
                tag: 'D32',
                value: random3
            },

            {
                tag: 'D33',
                value: random2
            },

            {
                tag: 'D34',
                value: random
            },

            {
                tag: 'D35',
                value: random3
            },

            {
                tag: 'D36',
                value: random2
            },
            {
                tag: 'RSSI',
                value: 22
            }
            ]
        };

        client.publish(topic, JSON.stringify(dataPacket));
    }, 5000);
}


publishData();