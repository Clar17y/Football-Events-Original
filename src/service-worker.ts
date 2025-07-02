import { clientsClaim } from 'workbox-core';
import { precacheAndRoute } from 'workbox-precaching';
import { BackgroundSyncPlugin } from 'workbox-background-sync';
import { registerRoute } from 'workbox-routing';
import { NetworkOnly } from 'workbox-strategies';

self.skipWaiting();
clientsClaim();

precacheAndRoute(self.__WB_MANIFEST || []);

const bgSyncPlugin = new BackgroundSyncPlugin('eventQueue', {
  maxRetentionTime: 24 * 60,
});

registerRoute(
  ({ url }) => url.pathname.startsWith('/rpc/bulk_upsert'),
  new NetworkOnly({ plugins: [bgSyncPlugin] }),
  'POST'
);
