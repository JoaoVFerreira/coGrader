import express from 'express';
import { getRoutes } from '../../utils/extract.route.paths';

describe('getRoutes', () => {
  it('Should extract routes from Express app', () => {
    // ARRANGE
    const app = express();

    app.get('/health', (_req, res) => res.send('OK'));
    app.post('/api/jobs', (_req, res) => res.send('Created'));

    // ACT
    const routes = getRoutes(app);

    // ASSERT 
    expect(routes).toContainEqual({
      path: '/health',
      methods: ['GET'],
    });
    expect(routes).toContainEqual({
      path: '/api/jobs',
      methods: ['POST'],
    });
  });

  it('Should handle apps with no routes', () => {
    // ARRANGE
    const app = express();
    app.use((_req, _res, next) => next());

    // ACT
    const routes = getRoutes(app);

    // ASSERT
    expect(routes.filter(r => r.path !== '*')).toEqual([]);
  });

  it('Should handle multiple methods on same route', () => {
    // ARRANGE
    const app = express();
    const router = express.Router();

    router.route('/api/test')
      .get((_req, res) => res.send('GET'))
      .post((_req, res) => res.send('POST'));

    app.use(router);

    // ACT
    const routes = getRoutes(app);
    const testRoute = routes.find(r => r.path.includes('/api/test'));

    // ASSERT
    expect(testRoute).toBeDefined();
    expect(testRoute?.methods).toEqual(expect.arrayContaining(['GET', 'POST']));
  });
});
