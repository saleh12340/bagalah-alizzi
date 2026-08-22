CREATE TABLE `free_invoices` (
  `id` int AUTO_INCREMENT NOT NULL,
  `invoiceNo` varchar(40) NOT NULL,
  `customerName` varchar(200),
  `notes` text,
  `total` decimal(14,2) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `free_invoices_id` PRIMARY KEY(`id`),
  CONSTRAINT `free_invoices_invoiceNo_unique` UNIQUE(`invoiceNo`)
);
CREATE INDEX `free_invoice_date_idx` ON `free_invoices` (`createdAt`);
CREATE TABLE `free_invoice_items` (
  `id` int AUTO_INCREMENT NOT NULL,
  `invoiceId` int NOT NULL,
  `description` varchar(255) NOT NULL,
  `quantity` decimal(12,3) NOT NULL,
  `unitPrice` decimal(14,2) NOT NULL,
  `total` decimal(14,2) NOT NULL,
  CONSTRAINT `free_invoice_items_id` PRIMARY KEY(`id`)
);
