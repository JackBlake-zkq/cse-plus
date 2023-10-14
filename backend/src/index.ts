const { PORT, MAD_KEY } = process.env

import express, { Request, Response } from "express"
import axios from "axios"
import cors from "cors"

import rmp, { ITeacherPage } from '@mtucourses/rate-my-professors'

const app = express()
app.use(cors({
    origin: 'https://enroll.wisc.edu'
}))

const madgrades = axios.create({
    baseURL: 'https://api.madgrades.com',
    timeout: 5000,
    headers: {
        'Authorization': `Token token=${MAD_KEY}`
    }
})

app.get("/madgrades/courses", async (req: Request, res: Response) => {
    let { subjectAbbrev, courseNumber } = req.query as { subjectAbbrev?: string, courseNumber: string }
    if(!(subjectAbbrev && courseNumber)) {
        res.sendStatus(400);
        return
    }
    let out: { webUrl?: string, cumulative?: any, confident: boolean } = {
        confident: true
    }
    try {

        let coursesRes = await madgrades.get(`/v1/courses?query=${subjectAbbrev} ${courseNumber}`)
        let courses = coursesRes.data?.results
        if(!courses || courses.length < 1) {
            res.sendStatus(404)
            return
        }
        let course = courses.find((c: any) => (
            +c.number == +courseNumber && c.subjects.some((subject: any) => subject.abbreviation == subjectAbbrev)
        ))
        if(!course) {
            out.confident = false;
            course = courses[0]
        }

        let infoUrl = course.url
        let courseRes = await madgrades.get(infoUrl)
        let { gradesUrl, uuid } = courseRes.data
        out.webUrl = `https://madgrades.com/courses/${uuid}`
        let gradesRes = await madgrades.get(gradesUrl)
        let { cumulative } = gradesRes.data
        out.cumulative = cumulative
        res.json(out).status(200)
    } catch(e) {
        console.log(e)
        res.sendStatus(500)
    }

})

app.get("/rmp/profs", async (req: Request, res: Response) => {
    let { profQuery } = req.query as { profQuery?: string }
    if(!profQuery) {
        console.log("invalid q")
        res.sendStatus(400);
        return
    }
    try {
        let teachers = [
            ...await rmp.searchTeacher(profQuery, "U2Nob29sLTEyNTY="),
            //UW Madison has 2 school objects. I don't think this one has any profs on it but adding it to be safe
            ...await rmp.searchTeacher(profQuery, "U2Nob29sLTE4NDE4") 
        ]
        if(teachers.length < 1) {
            res.sendStatus(404);
            return
        }
        let { id } = teachers[0]
        let teacher: ITeacherPage & { webUrl?: string } = await rmp.getTeacher(id)
        teacher.webUrl = `https://www.ratemyprofessors.com/professor/${teacher.legacyId}`
        res.send(teacher).status(200)
    } catch(e) {
        res.sendStatus(500);
    }
})


const port = PORT || 3000;
app.listen(port, () => console.log(`App listening on port ${port}`))