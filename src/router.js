import {Router} from '@vaadin/router';

export const initRouter = (outlet) => {
  const router = new Router(outlet);
  router.setRoutes([
    {path: '/', redirect: '/employees'},
    {
      path: '/employees',
      component: 'page-employees',
      action: () => import('./pages/page-employees.js'),
    },
    {
      path: '/employees/new',
      component: 'page-employee-edit',
      action: () => import('./pages/page-employee-edit.js'),
    },
    {
      path: '/employees/:id',
      component: 'page-employee-edit',
      action: () => import('./pages/page-employee-edit.js'),
    },
    {path: '(.*)', redirect: '/employees'},
  ]);
  return router;
};
