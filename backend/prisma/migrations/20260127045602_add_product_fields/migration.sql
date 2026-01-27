-- CreateTable
CREATE TABLE "Product" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "barcode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "salePrice" INTEGER NOT NULL,
    "originalPrice" INTEGER,
    "costPrice" INTEGER,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "categoryLarge" TEXT NOT NULL,
    "categoryMedium" TEXT,
    "categorySmall" TEXT,
    "unit" TEXT,
    "origin" TEXT,
    "manufacturer" TEXT,
    "storageMethod" TEXT,
    "description" TEXT,
    "imageUrl" TEXT,
    "tags" TEXT,
    "isBest" BOOLEAN NOT NULL DEFAULT false,
    "isNew" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Product_barcode_key" ON "Product"("barcode");
