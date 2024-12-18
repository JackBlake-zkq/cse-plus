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
        let teachers;
        try {
            teachers = [
                ...await rmp.searchTeacher(profQuery, "U2Nob29sLTEyNTY="),
                //UW Madison has 2 school objects. I don't think this one has any profs on it but adding it to be safe
                ...await rmp.searchTeacher(profQuery, "U2Nob29sLTE4NDE4") 
            ]
        } catch(e) {
            console.error(e)
            res.send({status: 404})
            return
        }
        if(teachers.length < 1) {
            res.send({status: 404})
            return
        }
        let teach = teachers.find(t => t.firstName + " " + t.lastName == profQuery)
        if(!teach) {
            res.send({status: 404})
            return
        }
        let { id } = teach
        let teacher: RMPOutput = { ...await rmp.getTeacher(id), status: 200 }
        teacher.webUrl = `https://www.ratemyprofessors.com/professor/${teacher.legacyId}`
        res.send(teacher)
    } catch(e) {
        console.error(e)
        res.send({status: 500})
    }
}
 
export default handler