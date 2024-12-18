import type { PlasmoCSConfig } from "plasmo"
import { sendToBackground } from "@plasmohq/messaging"
import type { MadOutput } from "~types/mad"
import type { RMPOutput } from "~types/rmp"
import rmpLogo from "data-base64:~/assets/rmp_logo.svg"
import madgradesLogo from "data-base64:~/assets/madgrades_logo.svg"

export const config: PlasmoCSConfig = {
  matches: ["https://enroll.wisc.edu/*"]
}

const observer = new MutationObserver((records) => {
  if (!records.some(record => Array.from(record.addedNodes).some(node => (
    node instanceof HTMLAnchorElement && node.classList.contains("cse-plus-inserted")
  )))) {
    injectMadgrades();
    injectRMP();
  }
});
observer.observe(document.body, { subtree: true, childList: true })

const madAnchor = document.createElement("a")
madAnchor.id = "mad"
madAnchor.target = "_blank"
madAnchor.classList.add("cse-plus-inserted")

let lastCourse: string | undefined;

function percentageColor(percentage: number): string {
  //value from 0 to 1
  var hue=((percentage/100)*120).toString(10);
  return ["hsl(",hue,",90%,40%)"].join("");
}

function rating1To5Color(rating: number): string {
  return percentageColor(rating * 20)
}

/**
 * Creates a generic card element with the given text and background color.
 * If a logoSrc is provided, an image is prepended.
 */
function createCard(text: string, bgColor: string, logoSrc?: string): HTMLSpanElement {
  const span = document.createElement("span")
  span.style.display = "inline-block"
  span.style.padding = "2px 6px"
  span.style.borderRadius = "4px"
  span.style.marginLeft = "5px"
  span.style.backgroundColor = bgColor
  span.style.color = "#FFFFFF"
  span.style.fontWeight = "bold"
  span.style.fontSize = "0.9em"
  span.style.verticalAlign = "middle"

  if (logoSrc) {
    const img = document.createElement("img")
    img.src = logoSrc
    img.style.height = "1em"
    img.style.verticalAlign = "middle"
    img.style.marginRight = "4px"
    span.appendChild(img)
  }
  
  const textNode = document.createTextNode(text)
  span.appendChild(textNode)

  return span
}

/** Create a Madgrades card with the madgrades logo */
function createMadgradesCard(madOut: MadOutput, errMsg: string = null): HTMLSpanElement {
  if (errMsg) return createCard(errMsg, "#555555", madgradesLogo)
  let { aCount, abCount, bCount, bcCount, cCount, dCount, fCount, total } = madOut.cumulative
  let totalGraded = aCount + abCount + bCount + bcCount + cCount + dCount + fCount
  if(totalGraded == 0) return createCard("No Grades", "#555555", madgradesLogo)
  let percA = Math.round((aCount / total) * 100)
  const bgColor = percentageColor(percA)
  return createCard(`${percA}% A`, bgColor, madgradesLogo)
}

/** Create an RMP card with the RMP logo */
function createRMPCard(profData: RMPOutput, errMsg: string = null): HTMLSpanElement {
  if (errMsg) return createCard(errMsg, "#555555", rmpLogo)
  if(profData.numRatings == 0) return createCard("No Ratings", "#555555", rmpLogo)
  return createCard(`${profData.avgRating}/5 (${profData.numRatings})`, rating1To5Color(profData.avgRating), rmpLogo)
}

async function injectMadgrades() {
  let detailsPane = document.getElementById("details")
  if (!detailsPane) return

  let contentArr = detailsPane.firstElementChild?.firstElementChild?.children
  if (!contentArr) return

  let courseElem = contentArr[1]
  if (!courseElem) return
  if (!courseElem.textContent) return

  let courseMatches = courseElem.textContent.match(/([A-Z] ?)+ \d{1,3}/)
  if (!courseMatches) return

  let course = courseMatches[0]

  let [subjectAbbrev, courseNumber] = course.split(/ (?=\d)/)

  if (lastCourse == course) return

  lastCourse = course

  madAnchor.textContent = ""

  let injectionArea = detailsPane.firstElementChild.children[1].firstElementChild.firstElementChild.firstElementChild
  injectionArea.after(madAnchor)

  let madOut: MadOutput;
  try {
    madOut = await sendToBackground({
      name: "mad",
      body: { subjectAbbrev, courseNumber }
    })
  } catch (e) {
    return
  }

  if (madOut.status != 200) {
    madAnchor.href = "https://madgrades.com/"
    let errText = "Unknown Error Occured"
    if (madOut.status == 404) {
      errText = "Not Found"
    }
    const errorCard = createMadgradesCard(null, errText)
    madAnchor.appendChild(errorCard)
    return
  }

  let { webUrl } = madOut
  madAnchor.href = webUrl

  const madCard = createMadgradesCard(madOut)
  madAnchor.appendChild(madCard)
}

async function injectRMP() {
  let instructorElems = document.querySelectorAll(".one-instructor, .instructor p:nth-child(2) strong")
  let instructorNameToElems: { [profName: string]: Element[] } = {}
  for (let instructorElem of instructorElems) {
    if (instructorElem.innerHTML.includes("RMP")) continue
    let profName = instructorElem.textContent.trim()
    if (!instructorNameToElems[profName]) instructorNameToElems[profName] = []
    instructorNameToElems[profName].push(instructorElem)
  }
  for (let [profName, elems] of Object.entries(instructorNameToElems)) {
    let profData: RMPOutput, res: RMPOutput, errMsg: string;
    try {
      res = await sendToBackground({
        name: "rmp",
        body: { profQuery: profName }
      })
      if (res.status == 200) {
        profData = res;
      } else {
        errMsg = "Unknown Error"
        if (res.status == 404) {
          errMsg = "Not Found"
        }
      }
    } catch (e) {
      errMsg = "Unknown Error"
    }
    for (let elem of elems) {
      if (elem.innerHTML.includes(rmpLogo)) continue
      let a = document.createElement("a")
      a.style.marginLeft = "5px"
      a.style.display = "inline-block"
      if (profData) {
        a.href = profData.webUrl
        const rmpCard = createRMPCard(profData)
        a.appendChild(rmpCard)
      } else {
        a.href = `https://www.ratemyprofessors.com/search/professors/18418?q=${encodeURIComponent(profName)}`
        const errorCard = createRMPCard(null, errMsg)
        a.appendChild(errorCard)
      }
      a.target = "_blank"
      a.classList.add("cse-plus-inserted")
      elem.appendChild(a)
    }
  }
}
