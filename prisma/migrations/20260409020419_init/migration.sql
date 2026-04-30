-- CreateTable
CREATE TABLE "Book" (
    "isbn" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "author" TEXT,
    "publisher" TEXT,
    "edition" TEXT,
    "printing" TEXT,
    "publishDate" TEXT,
    "size" TEXT,
    "pages" INTEGER,
    "category" TEXT,
    "categoryCode" TEXT,
    "categorySeq" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "BookCopy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "isbn" TEXT NOT NULL,
    "uniqueCode" TEXT NOT NULL,
    "copyNumber" INTEGER NOT NULL,
    "location" TEXT,
    "condition" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BookCopy_isbn_fkey" FOREIGN KEY ("isbn") REFERENCES "Book" ("isbn") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "BookCopy_uniqueCode_key" ON "BookCopy"("uniqueCode");
