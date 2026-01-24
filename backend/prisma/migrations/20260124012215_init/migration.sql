-- CreateTable
CREATE TABLE "Product" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description_origin" TEXT,
    "price" INTEGER NOT NULL,
    "originalPrice" INTEGER,
    "category" TEXT NOT NULL,
    "imageUrl" TEXT,
    "badge" TEXT,
    "isSoldOut" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);
