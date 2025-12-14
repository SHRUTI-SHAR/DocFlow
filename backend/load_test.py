"""
Document Processing Load Testing Tool
Comprehensive performance testing for PDF document extraction pipeline
"""

import json
import time
import base64
import statistics
import sys
from pathlib import Path
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, List, Any, Optional, Tuple
import requests
import psutil

# Try to import optional dependencies
try:
    import pandas as pd
    PANDAS_AVAILABLE = True
except ImportError:
    PANDAS_AVAILABLE = False
    print("⚠️ pandas not available - CSV export will be limited")

try:
    import sqlite3
    SQLITE_AVAILABLE = True
except ImportError:
    SQLITE_AVAILABLE = False
    print("⚠️ sqlite3 not available - database storage disabled")


class LoadTester:
    """Load testing tool for document processing API"""
    
    def __init__(self, config_path: str = "load_test_config.json"):
        """Initialize load tester with configuration"""
        self.config = self._load_config(config_path)
        self.results = []
        self.start_time = None
        self.process = psutil.Process()
        
        # Create output directory
        self.results_dir = Path(self.config['output']['results_dir'])
        self.results_dir.mkdir(exist_ok=True)
        
        # Generate test run ID
        self.test_run_id = datetime.now().strftime("%Y%m%d_%H%M%S")
        
    def _load_config(self, config_path: str) -> Dict:
        """Load test configuration from JSON file"""
        with open(config_path, 'r') as f:
            return json.load(f)
    
    def _read_pdf_as_base64(self, pdf_path: str) -> str:
        """Read PDF file and convert to base64 data URL"""
        try:
            with open(pdf_path, 'rb') as f:
                pdf_bytes = f.read()
                pdf_base64 = base64.b64encode(pdf_bytes).decode('utf-8')
                return f"data:application/pdf;base64,{pdf_base64}"
        except FileNotFoundError:
            print(f"❌ PDF not found: {pdf_path}")
            return None
    
    def _make_request(self, pdf_data: str, doc_name: str, max_workers: int, max_threads: int, yolo_enabled: bool) -> Dict:
        """Make a single API request and measure performance"""
        request_payload = {
            "documentData": pdf_data,
            "documentName": doc_name,
            "task": self.config['test_settings']['task'],
            "userId": "load-test-user",
            "saveToDatabase": self.config['test_settings']['save_to_database'],
            "maxWorkers": max_workers,
            "maxThreads": max_threads,
            "yoloSignatureEnabled": yolo_enabled
        }
        
        start_time = time.time()
        start_cpu = self.process.cpu_percent()
        start_memory = self.process.memory_info().rss / 1024 / 1024  # MB
        
        try:
            response = requests.post(
                self.config['api_endpoint'],
                json=request_payload,
                timeout=self.config['test_settings']['request_timeout']
            )
            
            end_time = time.time()
            end_cpu = self.process.cpu_percent()
            end_memory = self.process.memory_info().rss / 1024 / 1024  # MB
            
            duration = end_time - start_time
            success = response.status_code == 200
            
            result = {
                "success": success,
                "status_code": response.status_code,
                "duration": duration,
                "cpu_usage": (start_cpu + end_cpu) / 2,
                "memory_mb": end_memory,
                "memory_delta_mb": end_memory - start_memory,
                "timestamp": datetime.now().isoformat(),
                "error": None if success else response.text[:200],
                "error_type": None
            }
            
            # Extract additional metrics from response if available
            if success:
                try:
                    response_data = response.json()
                    result["pages_processed"] = response_data.get("metadata", {}).get("totalPages", 0)
                    result["fields_extracted"] = len(response_data.get("fields", []))
                except:
                    pass
            else:
                # Categorize error types
                if response.status_code == 402:
                    result["error_type"] = "API_CREDITS_EXHAUSTED"
                elif response.status_code == 429:
                    result["error_type"] = "RATE_LIMIT_EXCEEDED"
                elif response.status_code >= 500:
                    result["error_type"] = "SERVER_ERROR"
                elif response.status_code >= 400:
                    result["error_type"] = "CLIENT_ERROR"
                else:
                    result["error_type"] = "UNKNOWN_ERROR"
            
            return result
            
        except requests.exceptions.Timeout:
            return {
                "success": False,
                "status_code": 0,
                "duration": self.config['test_settings']['request_timeout'],
                "cpu_usage": 0,
                "memory_mb": 0,
                "memory_delta_mb": 0,
                "timestamp": datetime.now().isoformat(),
                "error": "Request timeout",
                "error_type": "TIMEOUT"
            }
        except Exception as e:
            return {
                "success": False,
                "status_code": 0,
                "duration": time.time() - start_time,
                "cpu_usage": 0,
                "memory_mb": 0,
                "memory_delta_mb": 0,
                "timestamp": datetime.now().isoformat(),
                "error": str(e)[:200],
                "error_type": "EXCEPTION"
            }
    
    def _run_concurrent_requests(
        self, 
        pdf_data: str, 
        doc_info: Dict, 
        thread_count: int,
        max_workers: int,
        max_threads: int,
        yolo_enabled: bool,
        config_name: str = "Default"
    ) -> List[Dict]:
        """Run multiple concurrent requests"""
        print(f"\n{'='*80}")
        print(f"🧪 Testing: {thread_count} concurrent requests | {doc_info['name']} ({doc_info['pages']} pages)")
        print(f"   Config: {config_name}")
        print(f"   Settings: maxWorkers={max_workers}, maxThreads={max_threads}, YOLO={yolo_enabled}")
        print(f"{'='*80}")
        
        results = []
        
        with ThreadPoolExecutor(max_workers=thread_count) as executor:
            # Submit all requests
            futures = []
            for i in range(thread_count):
                doc_name = f"{doc_info['name']}_thread_{i+1}"
                future = executor.submit(
                    self._make_request,
                    pdf_data,
                    doc_name,
                    max_workers,
                    max_threads,
                    yolo_enabled
                )
                futures.append(future)
            
            # Collect results with progress indicator
            completed = 0
            for future in as_completed(futures):
                result = future.result()
                results.append(result)
                completed += 1
                
                # Progress indicator
                progress = (completed / thread_count) * 100
                bar_length = 40
                filled = int(bar_length * completed / thread_count)
                bar = '█' * filled + '░' * (bar_length - filled)
                
                status = "✅" if result['success'] else "❌"
                print(f"\r  Progress: [{bar}] {progress:.0f}% ({completed}/{thread_count}) {status} {result['duration']:.2f}s", end='', flush=True)
        
        print()  # New line after progress
        return results
    
    def _calculate_metrics(self, results: List[Dict], doc_info: Dict, thread_count: int, config_name: str, max_workers: int, max_threads: int, yolo_enabled: bool) -> Dict:
        """Calculate aggregate metrics from results"""
        successful = [r for r in results if r['success']]
        failed = [r for r in results if not r['success']]
        
        durations = [r['duration'] for r in successful] if successful else [0]
        
        # Count error types
        error_breakdown = {}
        for result in failed:
            error_type = result.get('error_type', 'UNKNOWN')
            error_breakdown[error_type] = error_breakdown.get(error_type, 0) + 1
        
        metrics = {
            "thread_count": thread_count,
            "document_name": doc_info['name'],
            "document_pages": doc_info['pages'],
            "document_complexity": doc_info['complexity'],
            "config_name": config_name,
            "max_workers": max_workers,
            "max_threads": max_threads,
            "yolo_enabled": yolo_enabled,
            "total_requests": len(results),
            "successful_requests": len(successful),
            "failed_requests": len(failed),
            "success_rate_percent": (len(successful) / len(results) * 100) if results else 0,
            
            # Timing metrics
            "avg_response_time": statistics.mean(durations),
            "min_response_time": min(durations),
            "max_response_time": max(durations),
            "median_response_time": statistics.median(durations),
            "p90_response_time": self._percentile(durations, 90),
            "p95_response_time": self._percentile(durations, 95),
            "p99_response_time": self._percentile(durations, 99),
            
            # Throughput
            "total_duration": sum(durations),
            "requests_per_second": len(successful) / sum(durations) if sum(durations) > 0 else 0,
            "pages_per_second": (len(successful) * doc_info['pages']) / sum(durations) if sum(durations) > 0 else 0,
            
            # Resource usage
            "avg_cpu_percent": statistics.mean([r['cpu_usage'] for r in successful]) if successful else 0,
            "avg_memory_mb": statistics.mean([r['memory_mb'] for r in successful]) if successful else 0,
            "peak_memory_mb": max([r['memory_mb'] for r in results]) if results else 0,
            
            # Errors
            "error_types": self._count_error_types(failed),
            "error_breakdown": error_breakdown,
            
            "timestamp": datetime.now().isoformat(),
            "test_run_id": self.test_run_id
        }
        
        return metrics
    
    def _percentile(self, data: List[float], percentile: int) -> float:
        """Calculate percentile value"""
        if not data:
            return 0
        sorted_data = sorted(data)
        index = int(len(sorted_data) * percentile / 100)
        return sorted_data[min(index, len(sorted_data) - 1)]
    
    def _count_error_types(self, failed_results: List[Dict]) -> Dict[str, int]:
        """Count occurrences of different error types"""
        error_counts = {}
        for result in failed_results:
            error = result.get('error', 'Unknown error')
            error_key = error[:50]  # First 50 chars
            error_counts[error_key] = error_counts.get(error_key, 0) + 1
        return error_counts
    
    def _print_metrics_summary(self, metrics: Dict):
        """Print formatted metrics summary"""
        print(f"\n📊 Results Summary:")
        print(f"   Config: {metrics.get('config_name', 'Default')} (Workers:{metrics.get('max_workers', 'N/A')}, Threads:{metrics.get('max_threads', 'N/A')}, YOLO:{metrics.get('yolo_enabled', 'N/A')})")
        print(f"   Success Rate: {metrics['success_rate_percent']:.1f}% ({metrics['successful_requests']}/{metrics['total_requests']})")
        print(f"   Avg Response Time: {metrics['avg_response_time']:.2f}s")
        print(f"   Min/Max: {metrics['min_response_time']:.2f}s / {metrics['max_response_time']:.2f}s")
        print(f"   P90/P95/P99: {metrics['p90_response_time']:.2f}s / {metrics['p95_response_time']:.2f}s / {metrics['p99_response_time']:.2f}s")
        print(f"   Throughput: {metrics['requests_per_second']:.2f} req/s | {metrics['pages_per_second']:.2f} pages/s")
        print(f"   Avg CPU: {metrics['avg_cpu_percent']:.1f}% | Peak Memory: {metrics['peak_memory_mb']:.0f}MB")
        
        if metrics['failed_requests'] > 0:
            print(f"   ⚠️ Failures: {metrics['failed_requests']}")
            error_breakdown = metrics.get('error_breakdown', {})
            if error_breakdown:
                for error_type, count in error_breakdown.items():
                    print(f"      - {error_type}: {count}")
            for error, count in metrics['error_types'].items():
                print(f"      - {error}: {count}")
    
    def run_tests(self):
        """Run complete test suite"""
        print("="*80)
        print("🚀 DOCUMENT PROCESSING LOAD TEST")
        print("="*80)
        print(f"Test Run ID: {self.test_run_id}")
        print(f"Configuration: {len(self.config['thread_counts'])} thread configs × {len(self.config['test_pdfs'])} PDF types")
        print(f"Output Directory: {self.results_dir}")
        print("="*80)
        
        self.start_time = time.time()
        all_metrics = []
        
        # Load all PDFs
        pdf_data_cache = {}
        print("\n📁 Loading PDF files...")
        for doc_info in self.config['test_pdfs']:
            pdf_path = Path(doc_info['path'])
            if pdf_path.exists():
                pdf_data = self._read_pdf_as_base64(str(pdf_path))
                if pdf_data:
                    pdf_data_cache[doc_info['name']] = pdf_data
                    print(f"   ✅ {doc_info['name']}: {doc_info['pages']} pages ({doc_info['complexity']})")
            else:
                print(f"   ⚠️ {doc_info['name']}: File not found - {pdf_path}")
        
        if not pdf_data_cache:
            print("\n❌ No PDF files found! Please add test PDFs to the test_pdfs/ directory")
            print("   Create test PDFs or use existing ones and update load_test_config.json")
            return
        
        # Get backend test configurations
        backend_configs = self.config.get('backend_settings', {}).get('test_configurations', [
            {"name": "Default", "maxWorkers": 10, "maxThreads": 10, "yoloSignatureEnabled": True}
        ])
        
        # Run tests for each backend configuration, thread count, and PDF
        total_tests = len(backend_configs) * len(self.config['thread_counts']) * len(pdf_data_cache)
        current_test = 0
        
        for backend_config in backend_configs:
            config_name = backend_config.get('name', 'Default')
            max_workers = backend_config.get('maxWorkers', 10)
            max_threads = backend_config.get('maxThreads', 10)
            yolo_enabled = backend_config.get('yoloSignatureEnabled', True)
            
            print(f"\n\n{'#'*80}")
            print(f"# Backend Configuration: {config_name}")
            print(f"# maxWorkers={max_workers}, maxThreads={max_threads}, YOLO={yolo_enabled}")
            print(f"{'#'*80}")
            
            for thread_count in self.config['thread_counts']:
                for doc_info in self.config['test_pdfs']:
                    if doc_info['name'] not in pdf_data_cache:
                        continue
                    
                    current_test += 1
                    print(f"\n\n{'='*80}")
                    print(f"📝 Test {current_test}/{total_tests}")
                    print(f"{'='*80}")
                    
                    pdf_data = pdf_data_cache[doc_info['name']]
                    
                    # Run the concurrent requests
                    results = self._run_concurrent_requests(
                        pdf_data,
                        doc_info,
                        thread_count,
                        max_workers,
                        max_threads,
                        yolo_enabled,
                        config_name
                    )
                    
                    # Calculate metrics
                    metrics = self._calculate_metrics(results, doc_info, thread_count, config_name, max_workers, max_threads, yolo_enabled)
                    all_metrics.append(metrics)
                    
                    # Print summary
                    self._print_metrics_summary(metrics)
        
        # Save results
        print(f"\n\n{'='*80}")
        print("💾 Saving Results...")
        print(f"{'='*80}")
        self._save_results(all_metrics)
        
        total_time = time.time() - self.start_time
        print(f"\n✅ Load test completed in {total_time:.2f}s")
        print(f"📊 Results saved to: {self.results_dir}/")
    
    def _save_results(self, metrics: List[Dict]):
        """Save results in multiple formats"""
        timestamp = self.test_run_id
        
        # Save JSON
        if self.config['output']['save_json']:
            json_path = self.results_dir / f"load_test_{timestamp}.json"
            with open(json_path, 'w') as f:
                json.dump({
                    "test_run_id": self.test_run_id,
                    "config": self.config,
                    "metrics": metrics,
                    "summary": self._generate_summary(metrics)
                }, f, indent=2)
            print(f"   ✅ JSON: {json_path}")
        
        # Save CSV
        if self.config['output']['save_csv'] and PANDAS_AVAILABLE:
            csv_path = self.results_dir / f"load_test_{timestamp}.csv"
            df = pd.DataFrame(metrics)
            df.to_csv(csv_path, index=False)
            print(f"   ✅ CSV: {csv_path}")
        
        # Save HTML report
        if self.config['output']['save_html']:
            html_path = self.results_dir / f"load_test_{timestamp}.html"
            self._generate_html_report(metrics, html_path)
            print(f"   ✅ HTML: {html_path}")
        
        # Save to SQLite
        if self.config['output']['save_sqlite'] and SQLITE_AVAILABLE:
            db_path = self.results_dir / "load_test_results.db"
            self._save_to_sqlite(metrics, db_path)
            print(f"   ✅ SQLite: {db_path}")
    
    def _generate_summary(self, metrics: List[Dict]) -> Dict:
        """Generate overall test summary"""
        return {
            "total_tests": len(metrics),
            "total_requests": sum(m['total_requests'] for m in metrics),
            "total_successful": sum(m['successful_requests'] for m in metrics),
            "total_failed": sum(m['failed_requests'] for m in metrics),
            "overall_success_rate": (sum(m['successful_requests'] for m in metrics) / sum(m['total_requests'] for m in metrics) * 100) if metrics else 0,
            "avg_response_time": statistics.mean([m['avg_response_time'] for m in metrics]) if metrics else 0,
            "best_throughput_rps": max([m['requests_per_second'] for m in metrics]) if metrics else 0,
            "test_duration_seconds": time.time() - self.start_time if self.start_time else 0
        }
    
    def _generate_html_report(self, metrics: List[Dict], output_path: Path):
        """Generate HTML report with charts"""
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <title>Load Test Report - {self.test_run_id}</title>
    <meta charset="UTF-8">
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
        }}
        .container {{
            max-width: 1400px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }}
        h1 {{
            color: #2563eb;
            border-bottom: 3px solid #2563eb;
            padding-bottom: 10px;
        }}
        h2 {{
            color: #1e40af;
            margin-top: 30px;
        }}
        .summary {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin: 20px 0;
        }}
        .metric-card {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }}
        .metric-value {{
            font-size: 32px;
            font-weight: bold;
            margin: 10px 0;
        }}
        .metric-label {{
            font-size: 14px;
            opacity: 0.9;
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }}
        th, td {{
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #e5e7eb;
        }}
        th {{
            background: #f3f4f6;
            font-weight: 600;
            color: #374151;
        }}
        tr:hover {{
            background: #f9fafb;
        }}
        .success {{
            color: #10b981;
            font-weight: bold;
        }}
        .failure {{
            color: #ef4444;
            font-weight: bold;
        }}
        .chart-container {{
            margin: 30px 0;
            padding: 20px;
            background: #f9fafb;
            border-radius: 8px;
        }}
    </style>
</head>
<body>
    <div class="container">
        <h1>📊 Load Test Report</h1>
        <p><strong>Test Run ID:</strong> {self.test_run_id}</p>
        <p><strong>Generated:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
        
        <h2>📈 Overall Summary</h2>
        <div class="summary">
            <div class="metric-card">
                <div class="metric-label">Total Tests</div>
                <div class="metric-value">{len(metrics)}</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Total Requests</div>
                <div class="metric-value">{sum(m['total_requests'] for m in metrics)}</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Success Rate</div>
                <div class="metric-value">{(sum(m['successful_requests'] for m in metrics) / sum(m['total_requests'] for m in metrics) * 100):.1f}%</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Avg Response Time</div>
                <div class="metric-value">{statistics.mean([m['avg_response_time'] for m in metrics]):.2f}s</div>
            </div>
        </div>
        
        <h2>📋 Detailed Results</h2>
        <table>
            <thead>
                <tr>
                    <th>Config</th>
                    <th>Threads</th>
                    <th>Document</th>
                    <th>Pages</th>
                    <th>Workers</th>
                    <th>YOLO</th>
                    <th>Success Rate</th>
                    <th>Avg Time (s)</th>
                    <th>P95 (s)</th>
                    <th>Throughput (req/s)</th>
                    <th>CPU %</th>
                    <th>Memory (MB)</th>
                </tr>
            </thead>
            <tbody>
"""
        
        for m in metrics:
            success_class = "success" if m['success_rate_percent'] >= 95 else "failure"
            html_content += f"""
                <tr>
                    <td>{m.get('config_name', 'Default')}</td>
                    <td>{m['thread_count']}</td>
                    <td>{m['document_name']}</td>
                    <td>{m['document_pages']}</td>
                    <td>{m.get('max_workers', 'N/A')}</td>
                    <td>{'✅' if m.get('yolo_enabled', False) else '❌'}</td>
                    <td class="{success_class}">{m['success_rate_percent']:.1f}%</td>
                    <td>{m['avg_response_time']:.2f}</td>
                    <td>{m['p95_response_time']:.2f}</td>
                    <td>{m['requests_per_second']:.2f}</td>
                    <td>{m['avg_cpu_percent']:.1f}</td>
                    <td>{m['peak_memory_mb']:.0f}</td>
                </tr>
"""
        
        html_content += """
            </tbody>
        </table>
        
        <h2>🎯 Key Findings</h2>
        <div class="chart-container">
            <h3>Best Performing Configuration</h3>
"""
        
        # Find best config
        best = max(metrics, key=lambda x: x['requests_per_second'] if x['success_rate_percent'] >= 95 else 0)
        html_content += f"""
            <p><strong>Configuration:</strong> {best.get('config_name', 'Default')}</p>
            <p><strong>Thread Count:</strong> {best['thread_count']}</p>
            <p><strong>Document:</strong> {best['document_name']} ({best['document_pages']} pages)</p>
            <p><strong>Backend Settings:</strong> maxWorkers={best.get('max_workers', 'N/A')}, maxThreads={best.get('max_threads', 'N/A')}, YOLO={best.get('yolo_enabled', 'N/A')}</p>
            <p><strong>Throughput:</strong> {best['requests_per_second']:.2f} requests/second</p>
            <p><strong>Success Rate:</strong> {best['success_rate_percent']:.1f}%</p>
        </div>
        
        <h2>💡 Recommendations</h2>
        <ul>
"""
        
        # Generate recommendations
        recommendations = self._generate_recommendations(metrics)
        for rec in recommendations:
            html_content += f"            <li>{rec}</li>\n"
        
        html_content += """
        </ul>
    </div>
</body>
</html>
"""
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(html_content)
    
    def _generate_recommendations(self, metrics: List[Dict]) -> List[str]:
        """Generate recommendations based on test results"""
        recommendations = []
        
        # Find optimal thread count
        successful_metrics = [m for m in metrics if m['success_rate_percent'] >= 95]
        if successful_metrics:
            best = max(successful_metrics, key=lambda x: x['requests_per_second'])
            recommendations.append(f"Optimal thread count for best throughput: {best['thread_count']} concurrent requests")
        
        # Check for failures at high concurrency
        high_concurrency = [m for m in metrics if m['thread_count'] >= 100]
        if high_concurrency:
            avg_success = statistics.mean([m['success_rate_percent'] for m in high_concurrency])
            if avg_success < 90:
                recommendations.append(f"⚠️ High concurrency (100+ threads) shows degraded success rate ({avg_success:.1f}%). Consider limiting concurrent requests.")
        
        # Memory usage
        peak_memory = max([m['peak_memory_mb'] for m in metrics])
        if peak_memory > 4000:
            recommendations.append(f"⚠️ High memory usage detected ({peak_memory:.0f}MB). Consider optimizing document processing or adding more RAM.")
        
        # Document complexity
        complex_docs = [m for m in metrics if m['document_pages'] >= 100]
        if complex_docs:
            avg_time = statistics.mean([m['avg_response_time'] for m in complex_docs])
            recommendations.append(f"Large documents (100+ pages) take an average of {avg_time:.1f}s to process. Consider implementing batch processing or async notifications.")
        
        return recommendations
    
    def _save_to_sqlite(self, metrics: List[Dict], db_path: Path):
        """Save metrics to SQLite database"""
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Create table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS load_test_results (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                test_run_id TEXT,
                thread_count INTEGER,
                document_name TEXT,
                document_pages INTEGER,
                document_complexity TEXT,
                total_requests INTEGER,
                successful_requests INTEGER,
                failed_requests INTEGER,
                success_rate_percent REAL,
                avg_response_time REAL,
                min_response_time REAL,
                max_response_time REAL,
                p90_response_time REAL,
                p95_response_time REAL,
                p99_response_time REAL,
                requests_per_second REAL,
                pages_per_second REAL,
                avg_cpu_percent REAL,
                peak_memory_mb REAL,
                timestamp TEXT
            )
        ''')
        
        # Insert metrics
        for m in metrics:
            cursor.execute('''
                INSERT INTO load_test_results VALUES (
                    NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
                )
            ''', (
                m['test_run_id'],
                m['thread_count'],
                m['document_name'],
                m['document_pages'],
                m['document_complexity'],
                m['total_requests'],
                m['successful_requests'],
                m['failed_requests'],
                m['success_rate_percent'],
                m['avg_response_time'],
                m['min_response_time'],
                m['max_response_time'],
                m['p90_response_time'],
                m['p95_response_time'],
                m['p99_response_time'],
                m['requests_per_second'],
                m['pages_per_second'],
                m['avg_cpu_percent'],
                m['peak_memory_mb'],
                m['timestamp']
            ))
        
        conn.commit()
        conn.close()


def main():
    """Main entry point"""
    print("\n")
    print("╔" + "="*78 + "╗")
    print("║" + " "*20 + "DOCUMENT PROCESSING LOAD TESTER" + " "*26 + "║")
    print("╚" + "="*78 + "╝")
    print()
    
    # Check if config exists
    config_path = Path("load_test_config.json")
    if not config_path.exists():
        print("❌ Configuration file not found: load_test_config.json")
        print("   Please create the configuration file before running tests.")
        sys.exit(1)
    
    # Initialize and run tests
    tester = LoadTester(str(config_path))
    tester.run_tests()
    
    print("\n" + "="*80)
    print("🎉 Load testing complete! Check the test_results/ directory for reports.")
    print("="*80 + "\n")


if __name__ == "__main__":
    main()
