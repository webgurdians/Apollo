CREATE TABLE `audit_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenantId` text,
	`username` text NOT NULL,
	`action` text NOT NULL,
	`module` text NOT NULL,
	`metadata` text,
	`timestamp` integer NOT NULL,
	FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `background_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`jobType` text NOT NULL,
	`status` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`lastRun` integer
);
--> statement-breakpoint
CREATE TABLE `backups` (
	`id` text PRIMARY KEY NOT NULL,
	`filename` text NOT NULL,
	`sizeBytes` integer NOT NULL,
	`status` text NOT NULL,
	`storageProvider` text NOT NULL,
	`createdAt` integer NOT NULL,
	`verifiedAt` integer
);
--> statement-breakpoint
CREATE TABLE `emergency_killswitches` (
	`key` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`active` integer DEFAULT false NOT NULL,
	`triggeredBy` text NOT NULL,
	`triggeredAt` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `entity_activity` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entityType` text NOT NULL,
	`entityId` text NOT NULL,
	`action` text NOT NULL,
	`metadata` text,
	`timestamp` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `error_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`severity` text NOT NULL,
	`message` text NOT NULL,
	`stackTrace` text,
	`module` text NOT NULL,
	`status` text DEFAULT 'unresolved' NOT NULL,
	`timestamp` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `feature_flags` (
	`id` text PRIMARY KEY NOT NULL,
	`tenantId` text,
	`key` text NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`description` text,
	`enabled` integer DEFAULT false NOT NULL,
	`rolloutPercentage` integer DEFAULT 100 NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `founder_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`ipAddress` text,
	`userAgent` text,
	`startedAt` integer NOT NULL,
	`endedAt` integer
);
--> statement-breakpoint
CREATE TABLE `integration_registry` (
	`id` text PRIMARY KEY NOT NULL,
	`tenantId` text,
	`name` text NOT NULL,
	`enabled` integer DEFAULT false NOT NULL,
	`healthStatus` text DEFAULT 'unknown' NOT NULL,
	`lastSyncAt` integer,
	FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`channel` text NOT NULL,
	`status` text NOT NULL,
	`recipient` text,
	`payload` text,
	`createdAt` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ops_secrets` (
	`id` text PRIMARY KEY NOT NULL,
	`tenantId` text,
	`provider` text NOT NULL,
	`referenceKey` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`lastUpdated` integer NOT NULL,
	FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `releases` (
	`id` text PRIMARY KEY NOT NULL,
	`version` text NOT NULL,
	`gitCommit` text,
	`notes` text,
	`deployedAt` integer NOT NULL,
	`deployedBy` text
);
--> statement-breakpoint
CREATE TABLE `system_alerts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`severity` text NOT NULL,
	`message` text NOT NULL,
	`timestamp` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tenant_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`tenantId` text,
	`key` text NOT NULL,
	`value` text,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `tenants` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`subdomain` text,
	`status` text DEFAULT 'active' NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tenants_subdomain_unique` ON `tenants` (`subdomain`);--> statement-breakpoint
CREATE TABLE `webhook_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`status` text NOT NULL,
	`requestId` text NOT NULL,
	`response` text,
	`createdAt` integer NOT NULL
);
