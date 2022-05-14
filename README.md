# js_projects
public repository for my projects

# Main

### advanced validator is used to validate objects in javascript!
### the module can run saftly on node and in the browser, no need to have different versions!
### use cases: forum validation,server side validation, client side validation


# Documentation 

### the libary works like joi,you have 5 types of validators object,array,string,number and boolean.in the browser version you need to use a script tag to add the libary
### the libary has a global vartiable called "validator" make sure there are no other refrences with that name. the validator object contains all  the functionalities 
### for the validation.

## *example:*

![CODE!](schema_img.JPG)


### as you can see from the example above each object has function which return the instance that was created from the first call and add a layer of validation to that ### object,each one of those function has optional last argument called msg,if that argument is specifed as in the example above at [participant.clientId],any error ### validation error accured during validation will return that message error,in complex validation that has more then one stage like string.date its better to leave this ### argument empty.

### all keys by default are required but you can change then to optinal like in the example at key [height].


![CODE!](schema_img2.JPG)

# Validation Types:

### there are 2 validation types weakValidation and strongValidation! 
### from the example above to issue any of those validations you use thew validator object the first argument is the schema and the second is the inspected object

## *Diffrencies:*
### weakValidation validate only the adjucent keys that exist in both the schema and the target object, and evrey nested object bellow will be weak validated too,
### in the example the "value" object has 3 keys that exist in schema (age,colors,file) only those kets will be validate the rest of the schema would be ignore
### if the the inspected object has keys that dont exist in the schema they will be ignore too




