import type { GlossaryGroup } from "./types";

export const glossaryGroups: GlossaryGroup[] = [
  {
    title: "Close approaches",
    terms: [
      { term: "Close approach", explanation: "A forecast that two tracked objects will pass near one another. It describes proximity, not necessarily a likely collision." },
      { term: "Miss distance", explanation: "The smallest predicted distance between the centres of two objects. Smaller values deserve attention, but uncertainty must also be considered." },
      { term: "Time of closest approach", explanation: "The exact predicted time when the separation is smallest, commonly abbreviated as TCA. Predictions can move as newer orbit data arrives." },
      { term: "Probability of collision", explanation: "An estimate of the chance that the objects overlap at closest approach. It combines miss distance, object size and positional uncertainty." },
      { term: "Risk and confidence", explanation: "Risk describes the possible consequence and likelihood of an encounter. Confidence describes how strongly the available tracking data supports that estimate." },
      { term: "Position uncertainty", explanation: "The expected error around a propagated position rather than a single exact point. It normally grows as an orbit record becomes older." },
      { term: "Radial, in-track, cross-track", explanation: "Three directions used to express orbital position error. They point away from Earth, along the flight path and sideways across the orbital plane." },
      { term: "Conjunction data message", explanation: "A standard message containing the objects, encounter time, covariance and collision assessment for a close approach. It is often shortened to CDM." },
      { term: "Screening volume", explanation: "The region around a protected object used to decide which neighbours require closer analysis. Crossing it triggers evaluation, not an automatic collision warning." },
    ],
  },
  {
    title: "Acting on them",
    terms: [
      { term: "Closing speed", explanation: "How quickly the distance between two objects is decreasing before the encounter. Orbital encounters can have high closing speeds even when each orbit is stable." },
      { term: "Avoidance manoeuvre", explanation: "A planned engine burn that changes an object’s path enough to increase separation. Operators balance risk reduction against fuel, mission and timing constraints." },
      { term: "Delta-v", explanation: "The total velocity change produced by a manoeuvre, normally measured in metres per second. It is the practical cost paid from a spacecraft’s limited propulsion budget." },
    ],
  },
  {
    title: "Debris",
    terms: [
      { term: "Space debris", explanation: "A human-made object in orbit that no longer performs a useful mission. Examples include fragments, inactive spacecraft and spent rocket stages." },
      { term: "Kessler syndrome", explanation: "A cascade in which collisions create debris that causes additional collisions. Dense orbital regions are more vulnerable to this self-reinforcing effect." },
      { term: "Radar cross-section", explanation: "A measure of how strongly an object reflects radar energy, not simply its physical width. Shape, material and viewing angle can all change it." },
      { term: "End-of-life disposal", explanation: "The plan for a spacecraft after its mission ends. It may involve controlled re-entry, moving to a graveyard orbit or lowering the orbit for natural decay." },
    ],
  },
  {
    title: "Orbits",
    terms: [
      { term: "Low Earth Orbit", explanation: "The busy orbital region from roughly 160 to 2,000 kilometres above Earth. Most crewed vehicles and many observation satellites operate here." },
      { term: "Sun-synchronous orbit", explanation: "A near-polar orbit arranged to cross a location at nearly the same local solar time. It gives imaging missions consistent lighting conditions." },
      { term: "Altitude", explanation: "The object’s height above the reference Earth surface at a given time. It changes continuously in an elliptical orbit." },
      { term: "Inclination", explanation: "The angle between an orbital plane and Earth’s equator. It determines the highest and lowest latitudes covered by the ground track." },
      { term: "Ground track", explanation: "The path traced across Earth’s surface directly below an orbiting object. Earth’s rotation shifts each successive pass west or east." },
      { term: "Orbital decay", explanation: "A gradual loss of altitude caused mainly by atmospheric drag. The effect becomes stronger at lower altitudes and during increased solar activity." },
    ],
  },
  {
    title: "The data",
    terms: [
      { term: "Two-line element set", explanation: "A compact text record describing an orbit at a particular epoch, commonly called a TLE. It is intended for use with the SGP4 propagation model." },
      { term: "SGP4", explanation: "The standard mathematical model that turns a TLE into estimated positions and velocities over time. Accuracy decreases as propagation moves farther from the TLE epoch." },
      { term: "Catalogue number", explanation: "The persistent NORAD identifier assigned to a tracked space object. It remains the most reliable key when names or classifications vary between sources." },
      { term: "Stale orbit record", explanation: "An element set old enough that its propagated position may no longer be trustworthy. It should be refreshed before making an operational decision." },
    ],
  },
];
