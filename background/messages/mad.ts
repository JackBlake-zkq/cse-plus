import type { PlasmoMessaging } from "@plasmohq/messaging"
import type { MadInput, MadOutput } from "~types/mad"

const BASE_URL = 'https://api.madgrades.com'

const INIT = {
    headers: {
        "Authorization": `Token token=${process.env.PLASMO_PUBLIC_MAD_TOKEN}`,
        "Access-Control-Allow-Origin": "*"
    },
    credentials: "include" as RequestCredentials
}

let controller = new AbortController()

const handler: PlasmoMessaging.MessageHandler<MadInput, MadOutput> = async (req, res) => {
    console.log("mad handler invoked");
    let { subjectAbbrev, courseNumber } = req.body

    controller.abort()
    controller = new AbortController()
    let timeout = setTimeout(() => controller.abort(), 5000)

    const init = {...INIT, signal: controller.signal }

    if(!(subjectAbbrev && courseNumber)) {
        res.send({status: 400})
        return
    }

    let out: MadOutput = {
        status: 200
    }

    try {
        let coursesRes = await fetch(BASE_URL + `/v1/courses?query=${subjectAbbrev} ${courseNumber}`, init)
        let courses = (await coursesRes.json())?.results
        if(!courses || courses.length < 1) {
            res.send({status: 404})
            return
        }
        let course = courses.find((c: any) => (
            +c.number == +courseNumber && c.subjects.some((subject: any) => subject.abbreviation == subjectAbbrev)
        ))
        if(!course) {
            res.send({status: 404})
            return
        }
        let infoUrl = course.url
        let courseRes = await fetch(infoUrl, init)
        let { gradesUrl, uuid } = await courseRes.json()
        out.webUrl = `https://madgrades.com/courses/${uuid}`
        let gradesRes = await fetch(gradesUrl, init)
        let { cumulative } = await gradesRes.json()
        out.cumulative = cumulative
        res.send(out)
    } catch(e) {
        console.log(e)
        res.send({status: 500})
    } finally {
        clearTimeout(timeout)
    }
}
 
export default handler