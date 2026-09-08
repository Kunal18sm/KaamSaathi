// Fair Worker Allocation Engine for Sahkaar / SevaSetu
const store = require('../db/store');

// Haversine distance calculation in kilometers
function getHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

/**
 * Calculates distance-based Invite Fee:
 * - <= 3 km: ₹40
 * - 3 km to 5 km: ₹50
 * - > 5 km: ₹50 + ₹10 per km for every extra km over 5 km
 */
function calculateInviteFee(distKm) {
  if (distKm <= 3) return 40;
  if (distKm <= 5) return 50;
  return 50 + Math.ceil(distKm - 5) * 10;
}

/**
 * Finds eligible candidates and calculates the Fair Allocation Score.
 */
function findBestWorkerMatch(serviceName, customerLat, customerLng, isEmergency = false) {
  // Identify workers who currently have an active, uncompleted job
  const activeWorkerIds = new Set(
    store.bookings
      .filter(b => ['ASSIGNED', 'ACCEPTED', 'ARRIVED', 'IN_PROGRESS', 'MATERIAL_REQUESTED'].includes(b.status))
      .map(b => b.workerId)
  );

  const eligibleWorkers = store.workers.filter(w => 
    w.availability === true &&
    w.verificationStatus === 'VERIFIED' &&
    !activeWorkerIds.has(w.id) &&
    w.skills.some(skill => skill.toLowerCase().includes(serviceName.toLowerCase()) || serviceName.toLowerCase().includes(skill.toLowerCase()))
  );

  if (eligibleWorkers.length === 0) {
    return { error: 'No available verified workers found for this service near your location.' };
  }

  const service = store.services.find(s => 
    s.name.toLowerCase().includes(serviceName.toLowerCase()) || 
    serviceName.toLowerCase().includes(s.name.toLowerCase())
  ) || { basePrice: 450 };

  const scoredWorkers = eligibleWorkers.map(worker => {
    const distanceKm = getHaversineDistance(customerLat, customerLng, worker.location.lat, worker.location.lng);
    
    // Distance-Based Invite Fee & Fixed Labour Cost Calculation
    const inviteFee = calculateInviteFee(distanceKm);
    const labourCost = service.basePrice;
    const subtotal = inviteFee + labourCost;
    const serviceTax = Math.round(subtotal * 0.05);
    const totalEstimate = subtotal + serviceTax;

    // 1. Distance Score (0 to 1) - max effective radius 15km
    const distanceScore = Math.max(0, 1 - (distanceKm / 15));

    // 2. Skill & Experience Score (0 to 1)
    const skillScore = Math.min(1.0, worker.experienceYears / 8);

    // 3. Rating Score (0 to 1)
    const ratingScore = worker.rating / 5.0;

    // 4. Availability Score (1.0 since filtered available)
    const availabilityScore = 1.0;

    // 5. FAIRNESS SCORE (Income Equalization): Higher priority to workers with LOWER weekly earnings
    const fairnessScore = 1 / (1 + (worker.weeklyEarnings / 2500));

    let weights = {
      skill: 0.25,
      distance: 0.25,
      availability: 0.15,
      rating: 0.15,
      fairness: 0.20
    };

    if (isEmergency) {
      weights = {
        skill: 0.20,
        distance: 0.45,
        availability: 0.20,
        rating: 0.05,
        fairness: 0.10
      };
    }

    const totalScore = (
      (skillScore * weights.skill) +
      (distanceScore * weights.distance) +
      (availabilityScore * weights.availability) +
      (ratingScore * weights.rating) +
      (fairnessScore * weights.fairness)
    );

    let rationaleParts = [];
    rationaleParts.push(`Qualified ${worker.experienceYears}y exp ${serviceName} expert`);
    rationaleParts.push(`${distanceKm.toFixed(1)} km (Invite Fee: Rs. ${inviteFee}, Labour: Rs. ${labourCost})`);
    rationaleParts.push(`${worker.rating} star rating (${worker.jobsCompleted} completed jobs)`);
    if (worker.weeklyEarnings < 3000) {
      rationaleParts.push(`Boosted by Cooperative Fairness Priority (earned ₹${worker.weeklyEarnings} this week)`);
    }

    const rationale = `Assigned ${worker.name} (${worker.coopName}): ${rationaleParts.join(' • ')}.`;

    return {
      worker,
      distanceKm: parseFloat(distanceKm.toFixed(2)),
      pricing: {
        inviteFee,
        labourCost,
        distanceKm: parseFloat(distanceKm.toFixed(2)),
        subtotal,
        serviceTax,
        totalEstimate
      },
      scores: {
        totalScore: parseFloat((totalScore * 100).toFixed(1)),
        distanceScore: parseFloat((distanceScore * 100).toFixed(1)),
        skillScore: parseFloat((skillScore * 100).toFixed(1)),
        ratingScore: parseFloat((ratingScore * 100).toFixed(1)),
        fairnessScore: parseFloat((fairnessScore * 100).toFixed(1))
      },
      rationale
    };
  });

  scoredWorkers.sort((a, b) => b.scores.totalScore - a.scores.totalScore);

  return {
    bestMatch: scoredWorkers[0],
    allCandidates: scoredWorkers
  };
}

module.exports = {
  findBestWorkerMatch,
  getHaversineDistance,
  calculateInviteFee
};

