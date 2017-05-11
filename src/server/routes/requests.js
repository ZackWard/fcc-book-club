import * as models from "../models";

export function createRequest(req, res) {
    models.Book.findOne({ where: { id: Number(req.params.bookId) } })
    .then(book => {
        console.log(JSON.stringify(book));
        res.json(book);
    })
    .catch(error => {
        res.status(500).json(error);
    });
};

export function getRequests(req, res) {

};

export function editRequest(req, res) {

};

export function deleteRequest(req, res) {

};