const chai = require('chai');
const request = require('supertest');
const expect = chai.expect;
const app = require('./server');

describe('StudySync API', () => {
  it('should register a user', async () => {
    const res = await request(app)
      .post('/register')
      .send({ email: 'test@example.com', password: '123456', age: 20, academic_level: 'Sophomore', field_of_study: 'Computer Science', learning_style: 'Visual', schedule: { monday: '9-12' } });
    expect(res.status).to.equal(201);
    expect(res.body).to.have.property('id');
  });

  it('should login a user', async () => {
    await request(app).post('/register').send({ email: 'login@example.com', password: '123456' });
    const res = await request(app).post('/login').send({ email: 'login@example.com', password: '123456' });
    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('token');
  });
});