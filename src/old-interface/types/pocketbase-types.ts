/**
* This file was @generated using pocketbase-typegen
*/

import type PocketBase from 'pocketbase'
import type { RecordService } from 'pocketbase'

export enum Collections {
	PublishedThemes = "publishedThemes",
	Themes = "themes",
	Users = "users",
}

// Alias types for improved usability
export type IsoDateString = string
export type RecordIdString = string
export type HTMLString = string

// System fields
export type BaseSystemFields<T = never> = {
	id: RecordIdString
	created: IsoDateString
	updated: IsoDateString
	collectionId: string
	collectionName: Collections
	expand?: T
}

export type AuthSystemFields<T = never> = {
	email: string
	emailVisibility: boolean
	username: string
	verified: boolean
} & BaseSystemFields<T>

// Record types for each collection

export type PublishedThemesRecord = {
	coverImage?: string
	description?: string
	downloads?: string
	marqueeImage?: string
	name: string
	themeURL?: string
}

export type ThemesRecord<Ttheme = unknown> = {
	coverImage?: string
	description?: string
	downloads?: string
	images?: string[]
	name: string
	submitted?: boolean
	theme?: null | Ttheme
}

export type UsersRecord = {
	avatar?: string
	name?: string
}

// Response types include system fields and match responses from the PocketBase API
export type PublishedThemesResponse<Texpand = unknown> = Required<PublishedThemesRecord> & BaseSystemFields<Texpand>
export type ThemesResponse<Ttheme = unknown, Texpand = unknown> = Required<ThemesRecord<Ttheme>> & BaseSystemFields<Texpand>
export type UsersResponse<Texpand = unknown> = Required<UsersRecord> & AuthSystemFields<Texpand>

// Types containing all Records and Responses, useful for creating typing helper functions

export type CollectionRecords = {
	publishedThemes: PublishedThemesRecord
	themes: ThemesRecord
	users: UsersRecord
}

export type CollectionResponses = {
	publishedThemes: PublishedThemesResponse
	themes: ThemesResponse
	users: UsersResponse
}

// Type for usage with type asserted PocketBase instance
// https://github.com/pocketbase/js-sdk#specify-typescript-definitions

export type TypedPocketBase = PocketBase & {
	collection(idOrName: 'publishedThemes'): RecordService<PublishedThemesResponse>
	collection(idOrName: 'themes'): RecordService<ThemesResponse>
	collection(idOrName: 'users'): RecordService<UsersResponse>
}
