/* eslint-disable */

// @ts-nocheck

// noinspection JSUnusedGlobalSymbols

import { Route as rootRouteImport } from './routes/__root'
import { Route as SettingsRouteImport } from './routes/settings'
import { Route as ChatRouteImport } from './routes/chat'
import { Route as IndexRouteImport } from './routes/index'
import { Route as ApiChatRouteImport } from './routes/api/chat'
import { Route as AuthCallbackRouteImport } from './routes/auth.callback' // TAMBAH INI

const SettingsRoute = SettingsRouteImport.update({
  id: '/settings',
  path: '/settings',
  getParentRoute: () => rootRouteImport,
} as any)
const ChatRoute = ChatRouteImport.update({
  id: '/chat',
  path: '/chat',
  getParentRoute: () => rootRouteImport,
} as any)
const IndexRoute = IndexRouteImport.update({
  id: '/',
  path: '/',
  getParentRoute: () => rootRouteImport,
} as any)
const ApiChatRoute = ApiChatRouteImport.update({
  id: '/api/chat',
  path: '/api/chat',
  getParentRoute: () => rootRouteImport,
} as any)
const AuthCallbackRoute = AuthCallbackRouteImport.update({ // TAMBAH INI
  id: '/auth/callback',
  path: '/auth/callback',
  getParentRoute: () => rootRouteImport,
} as any)

export interface FileRoutesByFullPath {
  '/': typeof IndexRoute
  '/chat': typeof ChatRoute
  '/settings': typeof SettingsRoute
  '/api/chat': typeof ApiChatRoute
  '/auth/callback': typeof AuthCallbackRoute // TAMBAH INI
}
export interface FileRoutesByTo {
  '/': typeof IndexRoute
  '/chat': typeof ChatRoute
  '/settings': typeof SettingsRoute
  '/api/chat': typeof ApiChatRoute
  '/auth/callback': typeof AuthCallbackRoute // TAMBAH INI
}
export interface FileRoutesById {
  __root__: typeof rootRouteImport
  '/': typeof IndexRoute
  '/chat': typeof ChatRoute
  '/settings': typeof SettingsRoute
  '/api/chat': typeof ApiChatRoute
  '/auth/callback': typeof AuthCallbackRoute // TAMBAH INI
}
export interface FileRouteTypes {
  fileRoutesByFullPath: FileRoutesByFullPath
  fullPaths: '/' | '/chat' | '/settings' | '/api/chat' | '/auth/callback' // TAMBAH INI
  fileRoutesByTo: FileRoutesByTo
  to: '/' | '/chat' | '/settings' | '/api/chat' | '/auth/callback' // TAMBAH INI
  id: '__root__' | '/' | '/chat' | '/settings' | '/api/chat' | '/auth/callback' // TAMBAH INI
  fileRoutesById: FileRoutesById
}
export interface RootRouteChildren {
  IndexRoute: typeof IndexRoute
  ChatRoute: typeof ChatRoute
  SettingsRoute: typeof SettingsRoute
  ApiChatRoute: typeof ApiChatRoute
  AuthCallbackRoute: typeof AuthCallbackRoute // TAMBAH INI
}

declare module '@tanstack/react-router' {
  interface FileRoutesByPath {
    '/settings': {
      id: '/settings'
      path: '/settings'
      fullPath: '/settings'
      preLoaderRoute: typeof SettingsRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/chat': {
      id: '/chat'
      path: '/chat'
      fullPath: '/chat'
      preLoaderRoute: typeof ChatRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/': {
      id: '/'
      path: '/'
      fullPath: '/'
      preLoaderRoute: typeof IndexRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/api/chat': {
      id: '/api/chat'
      path: '/api/chat'
      fullPath: '/api/chat'
      preLoaderRoute: typeof ApiChatRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/auth/callback': { // TAMBAH INI
      id: '/auth/callback'
      path: '/auth/callback'
      fullPath: '/auth/callback'
      preLoaderRoute: typeof AuthCallbackRouteImport
      parentRoute: typeof rootRouteImport
    }
  }
}

const rootRouteChildren: RootRouteChildren = {
  IndexRoute: IndexRoute,
  ChatRoute: ChatRoute,
  SettingsRoute: SettingsRoute,
  ApiChatRoute: ApiChatRoute,
  AuthCallbackRoute: AuthCallbackRoute, // TAMBAH INI
}
export const routeTree = rootRouteImport
  ._addFileChildren(rootRouteChildren)
  ._addFileTypes<FileRouteTypes>()
