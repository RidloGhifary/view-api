export const defaultMockConfig = {
  "GET /health": {
    behavior: {
      successRate: 100,
      delay: 3000, // milliseconds
    },
    responses: {
      success: {
        statusCode: 200,
        body: {
          status: "success",
          message: "Life is good!",
          data: { healthy: true },
        },
      },
      errors: [
        {
          statusCode: 500,
          body: {
            status: "error",
            message: "Internal server error",
          },
        },
      ],
    },
  },

  "GET /products": {
    behavior: {
      successRate: 50,
    },
    responses: {
      success: {
        statusCode: 200,
        body: {
          status: "success",
          data: [
            { id: 1, name: "Product A", price: 120000 },
            { id: 2, name: "Product B", price: 90000 },
          ],
        },
      },
      errors: [
        {
          statusCode: 500,
          body: {
            status: "error",
            message: "Internal server error",
          },
        },
      ],
    },
  },
};
