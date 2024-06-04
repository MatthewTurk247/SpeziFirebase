//
// This source file is part of the Stanford Spezi open-source project
//
// SPDX-FileCopyrightText: 2022 Stanford University and the project authors (see CONTRIBUTORS.md)
//
// SPDX-License-Identifier: MIT
//

const admin = require("firebase-admin");
const firebaseTest = require("firebase-functions-test")();

jest.mock("firebase-admin", () => {
  const firestore = {
    doc: jest.fn(),
    collection: jest.fn(),
    runTransaction: jest.fn(),
  };
  return {
    initializeApp: jest.fn(),
    firestore: jest.fn(() => firestore),
    app: jest.fn(() => ({
      delete: jest.fn(),
    })),
  };
});

describe("InvitationCodeVerifier", () => {
  let firestore;

  beforeAll(() => {
    admin.initializeApp();
    firestore = admin.firestore();
    firebaseTest.mockConfig({invitationCodePath: "invitationCodes", userPath: "users"});
  });

  afterAll(() => {
    admin.app().delete();
    firebaseTest.cleanup();
  });

  test("should validate user invitation code successfully", () => {
    firestore.collection.mockReturnValue({
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({
        empty: false,
        docs: [{id: "validCode"}],
      }),
    });
    firestore.doc.mockReturnValueOnce({
      get: jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({invitationCode: "validCode"}),
      }),
    });
  });

  test("should throw an error if invitationCode does not exist or already used", () => {
    firestore.doc.mockReturnValueOnce({
      get: jest.fn().mockResolvedValue({exists: false}),
    });
  });

  describe("validateUserInvitationCode", () => {
    test("should throw an error if no valid invitation code found for the user", () => {
      firestore.collection.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({empty: true}),
      });
    });

    test("should throw an error if user document does not exist or contains incorrect invitation code", () => {
      firestore.collection.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({
          empty: false,
          docs: [{id: "validCode"}],
        }),
      });
      firestore.doc.mockReturnValueOnce({
        get: jest.fn().mockResolvedValue({exists: false}),
      });
    });
  });

  test("should not overwrite existing user information", () => {
    firestore.doc.mockReturnValueOnce({
      get: jest.fn().mockResolvedValue({exists: true, data: () => ({used: false})}),
    });
    firestore.doc.mockReturnValueOnce({
      get: jest.fn().mockResolvedValue({exists: false}),
    });
    firestore.runTransaction.mockImplementationOnce(async (updateFunction) => {
      await updateFunction({
        set: jest.fn(),
        update: jest.fn(),
      });
    });
  });
});