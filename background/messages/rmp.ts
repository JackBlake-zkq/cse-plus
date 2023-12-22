import type { PlasmoMessaging } from "@plasmohq/messaging"
import rmp from '@mtucourses/rate-my-professors'
import type { RMPInput, RMPOutput } from '~types/rmp';


const handler: PlasmoMessaging.MessageHandler<RMPInput, RMPOutput> = async (req, res) => {
    console.log("rmp handler invoked");
    let { profQuery } = req.body
    if(!profQuery) {
        console.log("invalid q")
        res.send({status: 400})
        return
    }
    try {
        let teachers = await rmp.searchTeacher(profQuery, "U2Nob29sLTEyNTY=")
        if(teachers.length < 1) {
            res.send({status: 404})
            return
        }
        let { id } = teachers[0]
        let teacher: RMPOutput = { ...await rmp.getTeacher(id), status: 200 }
        teacher.webUrl = `https://www.ratemyprofessors.com/professor/${teacher.legacyId}`
        res.send(teacher)
    } catch(e) {
        res.send({status: 500})
    }
}
 
export default handler