const Influx = require('influx');

const devID = 'INEM_DEMO';

// creating influxDb instance
const influx = new Influx.InfluxDB({
    'hostname': 'localhost',
    'database': 'deviceDb',
    schema: [{
        measurement: devID,
        fields: {
            value: Influx.FieldType.FLOAT,
            del: Influx.FieldType.INTEGER,
        },
        tags: [
            'sensor'
        ]
    }]
});

module.exports.storeDataToInfluxDb = async (payloadData) => {
    try {
        const deviceData = payloadData.data;
        // console.log(deviceData);
        // console.log(payloadData.device);

        deviceData.forEach(async sensorData => {
            await influx.writePoints([{
                measurement: payloadData.device,
                timestamp: payloadData.time*1000000,
                tags: { 'sensor': sensorData.tag },
                fields: { 'value': sensorData.value, 'del': 0 }
            }], { database: 'deviceDb', precision: 'ns' });
        })

    } catch (error) {
        console.log('Failed to store data to influxDb, server error!', error);
    }
}