const prod = process.env.NODE_ENV === "production"

import { config } from "dotenv"
if(!prod) config();

const { PORT, MAD_KEY } = process.env

import express from "express"
import axios from "axios"

import rmpModule from '@mtucourses/rate-my-professors'
const rmp = rmpModule.default

const app = express()

const madgrades = axios.create({
    baseURL: 'https://api.madgrades.com',
    timeout: 5000,
    headers: {
        'Authorization': `Token token=${MAD_KEY}`
    }
})

app.get("/madgrades/courses", async (req, res) => {
    let { subjectQuery, subjectAbbrev, courseNumber } = req.query
    let out = {}
    try {
        let subjectsRes = await madgrades.get(`/v1/subjects?query=${subjectQuery}`)
        let subjects = subjectsRes.data?.results

        let subject = subjects.find(subj => subj.abbreviation == subjectAbbrev)
        if(!subject) {
            res.send("Subject not found").status(404);
            return
        }

        let coursesRes = await madgrades.get(`/v1/courses?subject=${subject.code}&number=${courseNumber}`)
        let courses = coursesRes.data?.results
        if(!courses || courses.length < 1) {
            res.send("Course not found").status(404);
            return
        }

        let infoUrl = courses[0].url
        let courseRes = await madgrades.get(infoUrl)
        let { gradesUrl, uuid } = courseRes.data
        out.webUrl = `https://madgrades.com/courses/${uuid}`
        let gradesRes = await madgrades.get(gradesUrl)
        let { cumulative } = gradesRes.data
        out.cumulative = cumulative
    } catch(e) {
        console.log(e)
        res.sendStatus(500)
        return
    }
    res.json(out).status(200)
})

app.get("/rmp/profs", async (req, res) => {
    let { profQuery } = req.query
    let teacher
    try {
        let teachers = [
            ...await rmp.searchTeacher(profQuery, "U2Nob29sLTEyNTY="),
            //UW Madison has 2 school objects. I don't think this one has any profs on it but adding it to be safe
            ...await rmp.searchTeacher(profQuery, "U2Nob29sLTE4NDE4") 
        ]
        if(teachers.length < 1) {
            res.send("No teachers found with that name").status(404);
            return
        }
        let { id } = teachers[0]
        teacher = await rmp.getTeacher(id)
        teacher.webUrl = `https://www.ratemyprofessors.com/professor/${teacher.legacyId}`
    } catch(e) {
        res.sendStatus(500);
        return
    }
    res.send(teacher).status(200)
})


const port = PORT || 3000;
app.listen(port, () => console.log(`App listening on port ${port}`))