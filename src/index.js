const { response, request } = require('express');
const express = require('express');
const {v4: uuidv4} = require("uuid");

const app = express();

app.use(express.json());

const customers = [];

/**
 * cpf - string
 * name - string
 * id - uuid
 * statement - []
 */

// middleware
function verifyExistAccountCPF(request,response, next){
    const {cpf} = request.headers;

    const customer = customers.find(customer => customer.cpf === cpf);

    if(!customer) {
        response.status(400).json({error:"Customer not found."});
    }

    request.customer = customer;

    return next();
};

function getBalance(statement){
    const balance = statement.reduce((acc,operation) => {
        if(operation.type === 'credit') {
            return acc + operation.amount;
        }
        else{
            return acc - operation.amount;

        }
    },0);

    return balance;
}


app.post("/account", (request, response) =>{
    const {cpf, name} = request.body;

    const customersAlreadyExist = customers.some((customer) => customer.cpf === cpf);

    if(customersAlreadyExist){
        return response.status(400).json({error:"Customer alredy exist!"});
    }

    customers.push({
        cpf,
        name,
        id: uuidv4(),
        statement: []
    });

    return response.status(201).send();
});

//a linha 52 faz com que o middleware seja chamado por todas as chamadas abaixo.
//app.use(verifyExistAccountCPF);

//middleware dentro da rota, so sera usado especificamente nesta rota.
app.get("/statement", verifyExistAccountCPF, (request,response) =>{
    const {customer} = request;
    return response.json(customer.statement);
});

app.post("/deposit", verifyExistAccountCPF, (request,response) => {
    const { description, amount } = request.body;

    const {customer} = request;

    const statementOperation = {
        description,
        amount,
        created_at: new Date(),
        type: "credit"
    }

    customer.statement.push(statementOperation);

    return response.status(201).send();

});

app.post("/withdraw", verifyExistAccountCPF, (request,response) =>{
    const {amount} = request.body;

    const { customer } = request;

    const balance = getBalance(customer.statement);

    if(balance < amount){
        return response.status(400).json({error: "insufficient funds!"})
    }

    const statementOperation = {
        amount,
        created_at: new Date(),
        type: "bebit"
    };

    customer.statement.push(statementOperation);

    return response.status(201).send();
});


app.get("/statement/date", verifyExistAccountCPF, (request,response) =>{
    const { customer } = request;
    const { date } = request.query;

    const dateFormat = new Date(date + " 00:00");

    const statement = customer.statement.filter(
        (statement) => statement.created_at.toDateString() === new Date(dateFormat).toDateString()
    );

    return response.json(statement);
});

app.put("/account",verifyExistAccountCPF, (request,response) => {
    const { name } = request.body;
    const { customer } = request;

    customer.name = name;

    return response.status(201).send();
});

app.get("/account", verifyExistAccountCPF, (request,response) =>{
    const {customer} = request;
    return response.status(201).json(customer);
});

app.delete("/account", verifyExistAccountCPF, (request,response) =>{
    const { customer } = request;

    //splice
    customers.splice(customer, 1);

    return response.status(204).json(customers);
});

app.get("/balance", verifyExistAccountCPF, (request,response) =>{
 const { customer } = request;

 const balance = getBalance(customer.statement);

 return response.json(balance);
});

app.listen(3333);