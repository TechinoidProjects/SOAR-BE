const successResponse = (data) => {
     return {
       'ResponseCode': 200,
       'data': data
     };
   }
   
   const errorResponse = (message) => {
     return {
       'ResponseCode': 400,
       'Error': message
     };
   }
   
   module.exports = {
     successResponse,
     errorResponse
   }