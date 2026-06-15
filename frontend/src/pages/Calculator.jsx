import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Car, Zap, Utensils, Trash2, ArrowLeft, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';

const STEPS = [
  { key: 'transport', name: 'Transportation', icon: Car },
  { key: 'energy', name: 'Utilities & Water', icon: Zap },
  { key: 'diet', name: 'Diet & Meals', icon: Utensils },
  { key: 'purchases', name: 'Lifestyle & Waste', icon: Trash2 }
];

export default function Calculator({ onCalculationSuccess, showToast }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Form States
  // Transportation
  const [carMiles, setCarMiles] = useState(300);
  const [busMiles, setBusMiles] = useState(50);
  const [trainMiles, setTrainMiles] = useState(30);
  const [flightMiles, setFlightMiles] = useState(0);
  const [bikeMiles, setBikeMiles] = useState(20);

  // Utilities & Water
  const [electricityKwh, setElectricityKwh] = useState(150);
  const [gasKwh, setGasKwh] = useState(50);
  const [heatingKwh, setHeatingKwh] = useState(0);
  const [waterLiters, setWaterLiters] = useState(3000); // 3000 liters / month average per person

  // Diet
  const [vegMeals, setVegMeals] = useState(7);
  const [meatMeals, setMeatMeals] = useState(7);
  const [veganMeals, setVeganMeals] = useState(7);

  // Lifestyle & Waste
  const [clothingItems, setClothingItems] = useState(2);
  const [electronicsItems, setElectronicsItems] = useState(0);
  const [shippingPackages, setShippingPackages] = useState(3);
  const [wasteKg, setWasteKg] = useState(30); // 30 kg waste / month average per person

  // Running total calculation state
  const [realtimeTotals, setRealtimeTotals] = useState({
    transport: 0,
    energy: 0,
    diet: 0,
    waste: 0,
    water: 0,
    purchases: 0,
    total: 0
  });

  // Calculate realtime totals whenever states change
  useEffect(() => {
    const transport = (parseFloat(carMiles || 0) * 0.18) + (parseFloat(busMiles || 0) * 0.08) + (parseFloat(trainMiles || 0) * 0.04) + (parseFloat(flightMiles || 0) * 0.20);
    const energy = (parseFloat(electricityKwh || 0) * 0.40) + (parseFloat(gasKwh || 0) * 0.20) + (parseFloat(heatingKwh || 0) * 0.25);
    const diet = ((parseFloat(vegMeals || 0) * 0.6) + (parseFloat(meatMeals || 0) * 2.5) + (parseFloat(veganMeals || 0) * 0.3)) * 4.33;
    const waste = parseFloat(wasteKg || 0) * 0.5;
    const water = parseFloat(waterLiters || 0) * 0.0003;
    const purchases = (parseFloat(clothingItems || 0) * 10) + (parseFloat(electronicsItems || 0) * 80) + (parseFloat(shippingPackages || 0) * 1.5);
    const total = transport + energy + diet + waste + water + purchases;

    setRealtimeTotals({
      transport: Math.round(transport * 10) / 10,
      energy: Math.round(energy * 10) / 10,
      diet: Math.round(diet * 10) / 10,
      waste: Math.round(waste * 10) / 10,
      water: Math.round(water * 100) / 100,
      purchases: Math.round(purchases * 10) / 10,
      total: Math.round(total * 10) / 10
    });
  }, [
    carMiles, busMiles, trainMiles, flightMiles, bikeMiles,
    electricityKwh, gasKwh, heatingKwh, waterLiters,
    vegMeals, meatMeals, veganMeals,
    clothingItems, electronicsItems, shippingPackages, wasteKg
  ]);

  const validateStep = () => {
    const stepErrors = {};
    const isNumberOrEmpty = (val) => val === '' || (!isNaN(val) && parseFloat(val) >= 0);

    if (currentStep === 0) {
      if (!isNumberOrEmpty(carMiles)) stepErrors.carMiles = 'Must be a positive number';
      if (!isNumberOrEmpty(busMiles)) stepErrors.busMiles = 'Must be a positive number';
      if (!isNumberOrEmpty(trainMiles)) stepErrors.trainMiles = 'Must be a positive number';
      if (!isNumberOrEmpty(flightMiles)) stepErrors.flightMiles = 'Must be a positive number';
      if (!isNumberOrEmpty(bikeMiles)) stepErrors.bikeMiles = 'Must be a positive number';
    }

    if (currentStep === 1) {
      if (!isNumberOrEmpty(electricityKwh)) stepErrors.electricityKwh = 'Must be a positive number';
      if (!isNumberOrEmpty(gasKwh)) stepErrors.gasKwh = 'Must be a positive number';
      if (!isNumberOrEmpty(heatingKwh)) stepErrors.heatingKwh = 'Must be a positive number';
      if (!isNumberOrEmpty(waterLiters)) stepErrors.waterLiters = 'Must be a positive number';
    }

    if (currentStep === 2) {
      if (!isNumberOrEmpty(vegMeals)) stepErrors.vegMeals = 'Must be a positive number';
      if (!isNumberOrEmpty(meatMeals)) stepErrors.meatErrors = 'Must be a positive number';
      if (!isNumberOrEmpty(veganMeals)) stepErrors.veganMeals = 'Must be a positive number';

      const totalMeals = parseFloat(vegMeals || 0) + parseFloat(meatMeals || 0) + parseFloat(veganMeals || 0);
      if (totalMeals > 21) {
        stepErrors.dietTotal = 'Total meals per week cannot exceed 21 (3 meals per day)';
      }
    }

    if (currentStep === 3) {
      if (!isNumberOrEmpty(clothingItems)) stepErrors.clothingItems = 'Must be a positive integer';
      if (!isNumberOrEmpty(electronicsItems)) stepErrors.electronicsItems = 'Must be a positive integer';
      if (!isNumberOrEmpty(shippingPackages)) stepErrors.shippingPackages = 'Must be a positive integer';
      if (!isNumberOrEmpty(wasteKg)) stepErrors.wasteKg = 'Must be a positive number';
    }

    setErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep()) {
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
    }
  };

  const handlePrev = () => {
    setErrors({});
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;

    setLoading(true);

    const payload = {
      car_miles: parseFloat(carMiles || 0),
      bus_miles: parseFloat(busMiles || 0),
      train_miles: parseFloat(trainMiles || 0),
      flight_miles: parseFloat(flightMiles || 0),
      bike_miles: parseFloat(bikeMiles || 0),
      electricity_kwh: parseFloat(electricityKwh || 0),
      gas_kwh: parseFloat(gasKwh || 0),
      heating_kwh: parseFloat(heatingKwh || 0),
      water_liters: parseFloat(waterLiters || 0),
      veg_meals: parseFloat(vegMeals || 0),
      meat_meals: parseFloat(meatMeals || 0),
      vegan_meals: parseFloat(veganMeals || 0),
      waste_kg: parseFloat(wasteKg || 0),
      clothing_items: parseInt(clothingItems || 0),
      electronics_items: parseInt(electronicsItems || 0),
      shipping_packages: parseInt(shippingPackages || 0)
    };

    try {
      const result = await api.submitCalculation(payload);
      onCalculationSuccess(result);
      showToast('TerraSense monthly footprint logged! +50 Points');
      if (result.newlyAwardedBadges && result.newlyAwardedBadges.length > 0) {
        showToast(`Congratulations! You unlocked the badge: ${result.newlyAwardedBadges.join(', ')}`);
      }
    } catch (err) {
      showToast(err.message || 'Failed to submit calculation', 'error');
    } finally {
      setLoading(false);
    }
  };

  const ActiveIcon = STEPS[currentStep].icon;

  return (
    <div>
      <div className="top-header">
        <h1 className="page-title">Emissions Calculator</h1>
      </div>

      <div className="grid-cols-3">
        {/* Wizard Steps Form */}
        <div className="card flex-grow-2" style={{ gridColumn: 'span 2' }}>
          {/* Progress indicators */}
          <div className="wizard-steps">
            {STEPS.map((step, idx) => {
              return (
                <div 
                  key={step.key} 
                  className={`wizard-step ${idx === currentStep ? 'active' : ''} ${idx < currentStep ? 'completed' : ''}`}
                >
                  <div className="wizard-step-indicator">
                    {idx < currentStep ? <CheckCircle2 size={16} /> : idx + 1}
                  </div>
                  <span className="wizard-step-label">{step.name}</span>
                </div>
              );
            })}
          </div>

          <div style={{ minHeight: '280px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <ActiveIcon size={24} style={{ color: 'var(--accent-color)' }} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700' }}>{STEPS[currentStep].name}</h3>
            </div>

            {/* STEP 1: TRANSPORT */}
            {currentStep === 0 && (
              <div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '20px' }}>
                  Estimate your average monthly mileage across different modes of travel.
                </p>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="car">Personal Car (miles/month)</label>
                    <input
                      id="car"
                      type="number"
                      className="form-input"
                      value={carMiles}
                      onChange={(e) => setCarMiles(e.target.value)}
                    />
                    {errors.carMiles && <p className="form-error-msg">{errors.carMiles}</p>}
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="bus">Bus Transit (miles/month)</label>
                    <input
                      id="bus"
                      type="number"
                      className="form-input"
                      value={busMiles}
                      onChange={(e) => setBusMiles(e.target.value)}
                    />
                    {errors.busMiles && <p className="form-error-msg">{errors.busMiles}</p>}
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="train">Train Commuting (miles/month)</label>
                    <input
                      id="train"
                      type="number"
                      className="form-input"
                      value={trainMiles}
                      onChange={(e) => setTrainMiles(e.target.value)}
                    />
                    {errors.trainMiles && <p className="form-error-msg">{errors.trainMiles}</p>}
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="flight">Air Flights (miles/month)</label>
                    <input
                      id="flight"
                      type="number"
                      className="form-input"
                      value={flightMiles}
                      onChange={(e) => setFlightMiles(e.target.value)}
                    />
                    {errors.flightMiles && <p className="form-error-msg">{errors.flightMiles}</p>}
                  </div>
                </div>
                <div className="form-group" style={{ maxWidth: '48%' }}>
                  <label className="form-label" htmlFor="bike">Bicycle / Walking (miles/month)</label>
                  <input
                    id="bike"
                    type="number"
                    className="form-input"
                    value={bikeMiles}
                    onChange={(e) => setBikeMiles(e.target.value)}
                  />
                  {errors.bikeMiles && <p className="form-error-msg">{errors.bikeMiles}</p>}
                </div>
              </div>
            )}

            {/* STEP 2: UTILITIES & WATER */}
            {currentStep === 1 && (
              <div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '20px' }}>
                  Enter your monthly household utility and water consumption details.
                </p>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="electricity">Electricity (kWh/month)</label>
                    <input
                      id="electricity"
                      type="number"
                      className="form-input"
                      value={electricityKwh}
                      onChange={(e) => setElectricityKwh(e.target.value)}
                    />
                    {errors.electricityKwh && <p className="form-error-msg">{errors.electricityKwh}</p>}
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="gas">Natural Gas (kWh/month)</label>
                    <input
                      id="gas"
                      type="number"
                      className="form-input"
                      value={gasKwh}
                      onChange={(e) => setGasKwh(e.target.value)}
                    />
                    {errors.gasKwh && <p className="form-error-msg">{errors.gasKwh}</p>}
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="heating">Heating Oil / LPG (kWh/month)</label>
                    <input
                      id="heating"
                      type="number"
                      className="form-input"
                      value={heatingKwh}
                      onChange={(e) => setHeatingKwh(e.target.value)}
                    />
                    {errors.heatingKwh && <p className="form-error-msg">{errors.heatingKwh}</p>}
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="water">Water consumption (Liters/month)</label>
                    <input
                      id="water"
                      type="number"
                      className="form-input"
                      value={waterLiters}
                      onChange={(e) => setWaterLiters(e.target.value)}
                    />
                    {errors.waterLiters && <p className="form-error-msg">{errors.waterLiters}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: DIET */}
            {currentStep === 2 && (
              <div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '20px' }}>
                  Indicate the average number of meals you eat per week in each category (21 meals total).
                </p>
                {errors.dietTotal && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', marginBottom: '16px', fontSize: '0.85rem', fontWeight: '500' }}>
                    <AlertCircle size={16} />
                    <span>{errors.dietTotal}</span>
                  </div>
                )}
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="meat">Non-Vegetarian Meals (per week)</label>
                    <input
                      id="meat"
                      type="number"
                      className="form-input"
                      value={meatMeals}
                      onChange={(e) => setMeatMeals(e.target.value)}
                    />
                    {errors.meatErrors && <p className="form-error-msg">{errors.meatErrors}</p>}
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="veg">Vegetarian Meals (per week)</label>
                    <input
                      id="veg"
                      type="number"
                      className="form-input"
                      value={vegMeals}
                      onChange={(e) => setVegMeals(e.target.value)}
                    />
                    {errors.vegMeals && <p className="form-error-msg">{errors.vegMeals}</p>}
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="vegan">Vegan Meals (per week)</label>
                    <input
                      id="vegan"
                      type="number"
                      className="form-input"
                      value={veganMeals}
                      onChange={(e) => setVeganMeals(e.target.value)}
                    />
                    {errors.veganMeals && <p className="form-error-msg">{errors.veganMeals}</p>}
                  </div>
                  <div className="form-group" style={{ display: 'flex', alignItems: 'center', padding: '24px 0 0 12px' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      Total logged: <strong>{parseFloat(vegMeals || 0) + parseFloat(meatMeals || 0) + parseFloat(veganMeals || 0)} / 21</strong> meals/week
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: LIFESTYLE & WASTE */}
            {currentStep === 3 && (
              <div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '20px' }}>
                  Input your average retail purchases and waste generation details.
                </p>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="clothes">Clothing items bought (per month)</label>
                    <input
                      id="clothes"
                      type="number"
                      className="form-input"
                      value={clothingItems}
                      onChange={(e) => setClothingItems(e.target.value)}
                    />
                    {errors.clothingItems && <p className="form-error-msg">{errors.clothingItems}</p>}
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="electronics">Electronics bought (per month)</label>
                    <input
                      id="electronics"
                      type="number"
                      className="form-input"
                      value={electronicsItems}
                      onChange={(e) => setElectronicsItems(e.target.value)}
                    />
                    {errors.electronicsItems && <p className="form-error-msg">{errors.electronicsItems}</p>}
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="shipping">Online packages shipped (per month)</label>
                    <input
                      id="shipping"
                      type="number"
                      className="form-input"
                      value={shippingPackages}
                      onChange={(e) => setShippingPackages(e.target.value)}
                    />
                    {errors.shippingPackages && <p className="form-error-msg">{errors.shippingPackages}</p>}
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="waste">Waste generation (kg/month)</label>
                    <input
                      id="waste"
                      type="number"
                      className="form-input"
                      value={wasteKg}
                      onChange={(e) => setWasteKg(e.target.value)}
                    />
                    {errors.wasteKg && <p className="form-error-msg">{errors.wasteKg}</p>}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '24px', marginTop: '24px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handlePrev}
              disabled={currentStep === 0}
            >
              <ArrowLeft size={16} />
              Previous
            </button>

            {currentStep < STEPS.length - 1 ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleNext}
              >
                Next Step
                <ArrowRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? 'Submitting...' : 'Calculate & Save'}
                <CheckCircle2 size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Realtime Impact Preview sidebar */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: 'fit-content' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
            Real-time Estimate
          </h3>

          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{ fontSize: '3rem', fontWeight: '800', color: 'var(--accent-color)', lineHeight: 1 }}>
              {realtimeTotals.total}
            </div>
            <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: '600' }}>
              kg CO2e / month
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Category Split</h4>
            
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                <span style={{ fontWeight: '500' }}>Transportation</span>
                <strong>{realtimeTotals.transport} kg</strong>
              </div>
              <div style={{ height: '6px', backgroundColor: 'var(--bg-secondary)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${realtimeTotals.total > 0 ? (realtimeTotals.transport / realtimeTotals.total) * 100 : 0}%`, backgroundColor: 'var(--color-transport)' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                <span style={{ fontWeight: '500' }}>Home Utilities</span>
                <strong>{realtimeTotals.energy} kg</strong>
              </div>
              <div style={{ height: '6px', backgroundColor: 'var(--bg-secondary)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${realtimeTotals.total > 0 ? (realtimeTotals.energy / realtimeTotals.total) * 100 : 0}%`, backgroundColor: 'var(--color-energy)' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                <span style={{ fontWeight: '500' }}>Diet & Meals</span>
                <strong>{realtimeTotals.diet} kg</strong>
              </div>
              <div style={{ height: '6px', backgroundColor: 'var(--bg-secondary)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${realtimeTotals.total > 0 ? (realtimeTotals.diet / realtimeTotals.total) * 100 : 0}%`, backgroundColor: 'var(--color-diet)' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                <span style={{ fontWeight: '500' }}>Lifestyle & Waste</span>
                <strong>{Math.round((realtimeTotals.purchases + realtimeTotals.waste + realtimeTotals.water) * 10) / 10} kg</strong>
              </div>
              <div style={{ height: '6px', backgroundColor: 'var(--bg-secondary)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${realtimeTotals.total > 0 ? ((realtimeTotals.purchases + realtimeTotals.waste + realtimeTotals.water) / realtimeTotals.total) * 100 : 0}%`, backgroundColor: 'var(--color-purchases)' }} />
              </div>
            </div>
          </div>

          <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '12px 16px', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
            <strong>💡 Did you know?</strong> An average global monthly footprint is around 1,300 kg CO2e. Try to aim for under 500 kg!
          </div>
        </div>
      </div>
    </div>
  );
}
