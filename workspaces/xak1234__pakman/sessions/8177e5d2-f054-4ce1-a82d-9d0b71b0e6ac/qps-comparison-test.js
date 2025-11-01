// QPS Comparison Test - Measure before/after optimization performance
class QPSComparisonTest {
  constructor() {
    this.scenarios = [];
    this.currentScenario = null;
    this.results = [];
  }

  // Define test scenarios
  defineScenarios() {
    this.scenarios = [
      {
        name: 'Baseline - No Optimizations',
        description: 'Direct Firebase writes with all optimizations disabled',
        setup: this.setupBaseline.bind(this),
        duration: 60000 // 1 minute
      },
      {
        name: 'Firebase Optimizer Only',
        description: 'Firebase optimizer enabled, Cloud Functions disabled',
        setup: this.setupFirebaseOptimizer.bind(this),
        duration: 60000
      },
      {
        name: 'All Optimizations',
        description: 'Firebase optimizer + Cloud Functions + batching',
        setup: this.setupAllOptimizations.bind(this),
        duration: 60000
      }
    ];
  }

  // Setup baseline (no optimizations)
  setupBaseline() {
    // Disable Firebase optimizer
    if (window.firebaseOptimizer) {
      window.firebaseOptimizer.disable();
      console.log('🔴 [TEST] Firebase optimizer disabled');
    }

    // Disable Cloud Functions client
    if (window.cloudFunctionsClient) {
      window.cloudFunctionsClient.isAvailable = false;
      console.log('🔴 [TEST] Cloud Functions disabled');
    }

    console.log('📊 [TEST] Baseline setup complete - using direct Firebase writes only');
  }

  // Setup Firebase optimizer only
  setupFirebaseOptimizer() {
    // Enable Firebase optimizer
    if (window.firebaseOptimizer) {
      window.firebaseOptimizer.enable();
      console.log('🟡 [TEST] Firebase optimizer enabled');
    }

    // Disable Cloud Functions client
    if (window.cloudFunctionsClient) {
      window.cloudFunctionsClient.isAvailable = false;
      console.log('🔴 [TEST] Cloud Functions disabled');
    }

    console.log('📊 [TEST] Firebase optimizer setup complete');
  }

  // Setup all optimizations
  setupAllOptimizations() {
    // Enable Firebase optimizer
    if (window.firebaseOptimizer) {
      window.firebaseOptimizer.enable();
      console.log('🟢 [TEST] Firebase optimizer enabled');
    }

    // Enable Cloud Functions client
    if (window.cloudFunctionsClient) {
      window.cloudFunctionsClient.isAvailable = true;
      console.log('🟢 [TEST] Cloud Functions enabled');
    }

    console.log('📊 [TEST] All optimizations setup complete');
  }

  // Run a single scenario
  async runScenario(scenarioIndex) {
    if (scenarioIndex >= this.scenarios.length) {
      console.log('✅ [TEST] All scenarios completed');
      this.generateComparisonReport();
      return;
    }

    const scenario = this.scenarios[scenarioIndex];
    this.currentScenario = scenario;
    
    console.log(`\n🧪 [TEST] Starting scenario: ${scenario.name}`);
    console.log(`📝 [TEST] ${scenario.description}`);
    
    // Setup scenario
    scenario.setup();
    
    // Reset QPS profiler for clean measurement
    if (window.qpsProfiler) {
      window.qpsProfiler.reset();
    }

    // Wait a bit for setup to stabilize
    await this.sleep(2000);

    console.log(`⏱️ [TEST] Running for ${scenario.duration/1000} seconds...`);
    console.log('🎮 [TEST] Please play the multiplayer game actively during this test');

    // Wait for scenario duration
    await this.sleep(scenario.duration);

    // Collect results
    if (window.qpsProfiler) {
      const report = window.qpsProfiler.getPerformanceReport();
      this.results.push({
        scenario: scenario.name,
        report: report,
        timestamp: new Date().toISOString()
      });

      console.log(`📊 [TEST] Scenario complete - QPS: ${report.averages.totalQPS.toFixed(2)}`);
      console.log(`📊 [TEST] Writes/sec: ${report.averages.writesPerSecond.toFixed(2)} | Batches/sec: ${report.averages.batchesPerSecond.toFixed(2)}`);
    }

    // Short break between scenarios
    console.log('⏸️ [TEST] 10-second break before next scenario...');
    await this.sleep(10000);

    // Run next scenario
    this.runScenario(scenarioIndex + 1);
  }

  // Generate comparison report
  generateComparisonReport() {
    if (this.results.length === 0) {
      console.log('❌ [TEST] No results to compare');
      return;
    }

    console.log('\n📈 [COMPARISON] Performance Test Results:');
    console.log('=====================================');

    const comparison = {
      scenarios: [],
      improvements: {},
      summary: {}
    };

    // Process each result
    this.results.forEach(result => {
      const scenario = {
        name: result.scenario,
        totalQPS: result.report.averages.totalQPS,
        readsPerSecond: result.report.averages.readsPerSecond,
        writesPerSecond: result.report.averages.writesPerSecond,
        batchesPerSecond: result.report.averages.batchesPerSecond,
        errorRate: result.report.optimization.errorRate,
        batchEfficiency: result.report.optimization.batchEfficiency,
        totalOperations: result.report.totals.reads + result.report.totals.writes + result.report.totals.batches
      };
      
      comparison.scenarios.push(scenario);
      
      console.log(`\n${result.scenario}:`);
      console.log(`  Total QPS: ${scenario.totalQPS.toFixed(2)}`);
      console.log(`  Writes/sec: ${scenario.writesPerSecond.toFixed(2)}`);
      console.log(`  Batches/sec: ${scenario.batchesPerSecond.toFixed(2)}`);
      console.log(`  Error Rate: ${scenario.errorRate}`);
      console.log(`  Batch Efficiency: ${scenario.batchEfficiency}`);
      console.log(`  Total Ops: ${scenario.totalOperations}`);
    });

    // Calculate improvements
    if (comparison.scenarios.length >= 2) {
      const baseline = comparison.scenarios[0]; // First scenario is baseline
      
      comparison.scenarios.slice(1).forEach(scenario => {
        const improvements = {
          totalQPSChange: ((scenario.totalQPS - baseline.totalQPS) / baseline.totalQPS * 100).toFixed(1) + '%',
          writesChange: ((scenario.writesPerSecond - baseline.writesPerSecond) / baseline.writesPerSecond * 100).toFixed(1) + '%',
          batchesAdded: scenario.batchesPerSecond.toFixed(2) + ' batches/sec',
          efficiencyGain: scenario.batchEfficiency > 0 ? scenario.batchEfficiency + ' updates/batch' : 'N/A'
        };
        
        comparison.improvements[scenario.name] = improvements;
        
        console.log(`\n📈 ${scenario.name} vs Baseline:`);
        console.log(`  QPS Change: ${improvements.totalQPSChange}`);
        console.log(`  Writes Change: ${improvements.writesChange}`);
        console.log(`  Batching: ${improvements.batchesAdded}`);
        console.log(`  Batch Efficiency: ${improvements.efficiencyGain}`);
      });
    }

    // Overall summary
    if (comparison.scenarios.length > 0) {
      const bestScenario = comparison.scenarios.reduce((best, current) => 
        current.totalQPS < best.totalQPS ? current : best
      );
      
      comparison.summary = {
        bestPerforming: bestScenario.name,
        bestQPS: bestScenario.totalQPS.toFixed(2),
        recommendedConfig: this.getRecommendation(comparison.scenarios)
      };
      
      console.log('\n🏆 [SUMMARY]');
      console.log(`Best Performing: ${comparison.summary.bestPerforming}`);
      console.log(`Lowest QPS: ${comparison.summary.bestQPS}`);
      console.log(`Recommendation: ${comparison.summary.recommendedConfig}`);
    }

    // Export results
    this.exportResults(comparison);
    
    // Make results available globally
    window.qpsComparisonResults = comparison;
    console.log('\n💾 Results saved to window.qpsComparisonResults');
  }

  getRecommendation(scenarios) {
    // Find scenario with lowest total QPS (best for reducing Firebase load)
    const lowestQPS = scenarios.reduce((best, current) => 
      current.totalQPS < best.totalQPS ? current : best
    );
    
    // Find scenario with highest batch efficiency
    const highestBatching = scenarios.reduce((best, current) => 
      current.batchEfficiency > best.batchEfficiency ? current : best
    );
    
    if (lowestQPS.name === highestBatching.name) {
      return `Use "${lowestQPS.name}" for optimal performance`;
    } else {
      return `Use "${lowestQPS.name}" for lowest Firebase load, or "${highestBatching.name}" for best batching efficiency`;
    }
  }

  exportResults(comparison) {
    const exportData = {
      testDate: new Date().toISOString(),
      testDuration: this.scenarios[0]?.duration || 60000,
      comparison: comparison,
      rawResults: this.results
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qps-comparison-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('📊 [TEST] Comparison results exported');
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Start the full comparison test
  async startTest() {
    console.log('🧪 [TEST] Starting QPS Comparison Test');
    console.log('=======================================');
    console.log('This will test 3 scenarios for 1 minute each:');
    console.log('1. Baseline (no optimizations)');
    console.log('2. Firebase optimizer only');
    console.log('3. All optimizations enabled');
    console.log('');
    console.log('⚠️ IMPORTANT: Keep the multiplayer game active during testing!');
    console.log('   - Move players around continuously');
    console.log('   - Collect pellets and power-ups');
    console.log('   - Keep 2+ players active for realistic load');
    
    await this.sleep(5000); // Give user time to read
    
    this.defineScenarios();
    this.results = [];
    this.runScenario(0);
  }
}

// Make it globally available
window.QPSComparisonTest = QPSComparisonTest;

// Add easy console command
window.startQPSTest = () => {
  const test = new QPSComparisonTest();
  test.startTest();
};

console.log('🧪 [QPS-TEST] QPS Comparison Test loaded. Use startQPSTest() to begin comprehensive testing.');