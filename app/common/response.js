const successResponse = (data) => {
     return {
       'status': 200,
       'data': data
     };
   }
   
   const errorResponse = (message) => {
     return {
       'status': 400,
       'error': message
     };
   }
   
   module.exports = {
     successResponse,
     errorResponse
   }