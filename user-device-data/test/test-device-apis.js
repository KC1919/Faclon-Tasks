const mocha=require('mocha');
const expect=require('chai').expect;
const request=require('supertest');
const app = require('../index');
const baseURL='http://localhost:3000'

// kunal@email.com
describe('test uer device APIs', function(){
    let token;

    this.beforeAll(function (done) {
        request(baseURL)
            .post('/login')
            .send({ 'email': 'test@email.com', 'password': '123456789' })
            .set('Accept', 'application/json')
            .set('Content-Type', 'application/json')
            .end(function (err, res) {

                // console.log(res);

                expect(res.body.success).to.be.equal(true);
                expect(res.status).to.be.equal(200);
                expect(res.body.token).length.to.not.equal(0);

                token = res.body.token;

                done();

                console.log(token);
            })
    });

    it('test /addUserDevice API', function(done){

        request(baseURL)
        .post('/addUserDevice')
        .send({ 'devId': 'INEM_DEMO_2' })
        .set('Accept', 'application/json')
        .set('Cookie', `secret=${token}`)
        .end(function (err, res) {

            expect(res.status).to.be.equal(200);
            expect(res.body.success).to.be.equal(true);
            expect(res.body.message).to.equal('Device added successfully!');
            
            done();
        })
    })

    it('fetch /deviceData API test', function(done){

        request(baseURL)
        .get('/deviceData')
        .send({ 'deviceId': 'INEM_DEMO' })
        .set('Accept', 'application/json')
        .set('Cookie', `secret=${token}`)
        .end(function (err, res) {

            expect(res.status).to.be.equal(200);
            expect(res.body.success).to.be.equal(true);
            expect(res.body.data).length.to.not.equal(0);
            
            done();
        })
    })
})