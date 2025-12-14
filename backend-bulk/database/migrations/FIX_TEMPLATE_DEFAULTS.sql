-- QUICK FIX: Add default values from CORRECT.csv
-- Run this in Supabase SQL Editor
-- Template: bni_bwp_v1

-- CLEAR db_field_path for columns where we want to use default_value only
UPDATE template_columns SET db_field_path = NULL WHERE template_id = 'bni_bwp_v1' AND excel_column = 'Deed of Establishment Date';
UPDATE template_columns SET db_field_path = NULL WHERE template_id = 'bni_bwp_v1' AND excel_column = 'Contact Name';
UPDATE template_columns SET db_field_path = NULL WHERE template_id = 'bni_bwp_v1' AND excel_column = 'Days Past Due';
UPDATE template_columns SET db_field_path = NULL WHERE template_id = 'bni_bwp_v1' AND excel_column = 'Customer Since';
UPDATE template_columns SET db_field_path = NULL WHERE template_id = 'bni_bwp_v1' AND excel_column = 'Description';

-- Columns 1-10
-- Customer Since should be BLANK (empty string overrides any AI extraction)
UPDATE template_columns SET default_value = '' WHERE template_id = 'bni_bwp_v1' AND excel_column = 'Customer Since';
UPDATE template_columns SET default_value = 'N' WHERE template_id = 'bni_bwp_v1' AND excel_column = 'Is the portfolio condition need Ijin Prinsip';
UPDATE template_columns SET default_value = '' WHERE template_id = 'bni_bwp_v1' AND excel_column = 'Remarks';
UPDATE template_columns SET default_value = 'Pertambangan dan penggalian' WHERE template_id = 'bni_bwp_v1' AND excel_column = 'Business Sector';
UPDATE template_columns SET default_value = 'Penggalian batu-batuan, tanah liat dan pasir, serta pertambangan mineral dan bahan kimia' WHERE template_id = 'bni_bwp_v1' AND excel_column = 'Business Sub Sector';
UPDATE template_columns SET default_value = 'Pertambangan batu' WHERE template_id = 'bni_bwp_v1' AND excel_column = 'Business Field';
UPDATE template_columns SET default_value = 'PT Vitrama Indo Part' WHERE template_id = 'bni_bwp_v1' AND excel_column = 'Business Group';
UPDATE template_columns SET default_value = '08/08/2015' WHERE template_id = 'bni_bwp_v1' AND excel_column = 'Debtor Since';
UPDATE template_columns SET default_value = 'IDR' WHERE template_id = 'bni_bwp_v1' AND excel_column = 'Default Currency';
UPDATE template_columns SET default_value = 'PT Bumiwarna Agungperkasa (PT BWAP) merupakan perusahaan yang bergerak di bidang pertambangan batu split. PT BWAP didirikan sejak tanggal 22 Mei 1993 dan mempunyai konsesi area tambang batu granit yang berlokasi Desa Air Mesu Timur, Kabupaten Bangka Tengah, Provinsi Kepulauan Bangka Belitung.' WHERE template_id = 'bni_bwp_v1' AND excel_column = 'Business Description';

-- Columns 11-20
UPDATE template_columns SET default_value = 'Didi Sulistiono' WHERE template_id = 'bni_bwp_v1' AND excel_column = 'Key Person';
UPDATE template_columns SET default_value = 'PT Bumiwarna Agungperkasa (PT BWAP)' WHERE template_id = 'bni_bwp_v1' AND excel_column = 'Company Name';
UPDATE template_columns SET default_value = '220101691087' WHERE template_id = 'bni_bwp_v1' AND excel_column = 'NIK/NIB';
UPDATE template_columns SET default_value = '1.89983E+13' WHERE template_id = 'bni_bwp_v1' AND excel_column = 'NPWP';
UPDATE template_columns SET default_value = '18-06-2020' WHERE template_id = 'bni_bwp_v1' AND excel_column = 'Date of Issue';
UPDATE template_columns SET default_value = 'No' WHERE template_id = 'bni_bwp_v1' AND excel_column = 'NPL';
UPDATE template_columns SET default_value = 'CMB2' WHERE template_id = 'bni_bwp_v1' AND excel_column = 'Business Unit Details - Division';
UPDATE template_columns SET default_value = 'CMC Jatinegara' WHERE template_id = 'bni_bwp_v1' AND excel_column = 'Business Unit Details - Unit';
UPDATE template_columns SET default_value = 'Komplek Graha Mas Fatmawati Blok A 25-26, JI. RS Fatmawati No 71 Jakarta Selatan Prov. DKI Jakarta' WHERE template_id = 'bni_bwp_v1' AND excel_column = 'Head Office Address';
UPDATE template_columns SET default_value = 'DKI Jakarta' WHERE template_id = 'bni_bwp_v1' AND excel_column = 'State/Province';

-- Columns 21-30
UPDATE template_columns SET default_value = 'Jakarta Selatan' WHERE template_id = 'bni_bwp_v1' AND excel_column = 'City/county';
UPDATE template_columns SET default_value = 'Didi Sulistiono' WHERE template_id = 'bni_bwp_v1' AND excel_column = 'PIC (Person In charge) Name';
UPDATE template_columns SET default_value = 'Didi Sulistiono' WHERE template_id = 'bni_bwp_v1' AND excel_column = 'UBO (Ultimate Beneficiary Owner) Name';
UPDATE template_columns SET default_value = 'AHU-AH.01.09-0269223' WHERE template_id = 'bni_bwp_v1' AND excel_column = 'AHU ID';
UPDATE template_columns SET default_value = 'No' WHERE template_id = 'bni_bwp_v1' AND excel_column = 'Is Public company';
UPDATE template_columns SET default_value = 'Surat No. 0008/BWAP-BNI/X/2025' WHERE template_id = 'bni_bwp_v1' AND excel_column = 'Application from debtor/Prospective Debtor';
UPDATE template_columns SET default_value = '34' WHERE template_id = 'bni_bwp_v1' AND excel_column = 'Deed of Establishment ID';
UPDATE template_columns SET default_value = '22-5-1993' WHERE template_id = 'bni_bwp_v1' AND excel_column = 'Deed of Establishment Date';
UPDATE template_columns SET default_value = 'Indonesia' WHERE template_id = 'bni_bwp_v1' AND excel_column = 'Country of Incorporation';
UPDATE template_columns SET default_value = 'DKI Jakarta' WHERE template_id = 'bni_bwp_v1' AND excel_column = 'State/Province of Organization';

-- Columns 31-40
UPDATE template_columns SET default_value = '329' WHERE template_id = 'bni_bwp_v1' AND excel_column = 'Latest Amendment Deed ID';
UPDATE template_columns SET default_value = '29-10-2024' WHERE template_id = 'bni_bwp_v1' AND excel_column = 'Latest Amendment Deed Date';
UPDATE template_columns SET default_value = '' WHERE template_id = 'bni_bwp_v1' AND excel_column = 'Number of Employees';
UPDATE template_columns SET default_value = '32 tahun (sejak 1993)' WHERE template_id = 'bni_bwp_v1' AND excel_column = 'Years of Operation';
UPDATE template_columns SET default_value = 'WNI' WHERE template_id = 'bni_bwp_v1' AND excel_column = 'Citizenship Status';
UPDATE template_columns SET default_value = '' WHERE template_id = 'bni_bwp_v1' AND excel_column = 'Date Of Birth';
UPDATE template_columns SET default_value = 'Married' WHERE template_id = 'bni_bwp_v1' AND excel_column = 'Marital Status';
UPDATE template_columns SET default_value = 'PT Bumiwarna Agungperkasa (PT BWAP) merupakan perusahaan yang bergerak di bidang pertambangan batu split. PT BWAP didirikan sejak tanggal 22 Mei 1993.' WHERE template_id = 'bni_bwp_v1' AND excel_column = 'Company History';
UPDATE template_columns SET default_value = 'Pertambangan batu split' WHERE template_id = 'bni_bwp_v1' AND excel_column = 'Business Description';
UPDATE template_columns SET default_value = '1' WHERE template_id = 'bni_bwp_v1' AND excel_column = 'Collectibility (SLIK)';

-- Columns 41-50
UPDATE template_columns SET default_value = 'IDR Jutaan' WHERE template_id = 'bni_bwp_v1' AND excel_column = 'Sales Currency';
UPDATE template_columns SET default_value = '35.004' WHERE template_id = 'bni_bwp_v1' AND excel_column = 'Total Assets';
UPDATE template_columns SET default_value = 'IDR Jutaan' WHERE template_id = 'bni_bwp_v1' AND excel_column = 'Assets Currency';
UPDATE template_columns SET default_value = '31/12/2024' WHERE template_id = 'bni_bwp_v1' AND excel_column = 'Total Assets Date';
UPDATE template_columns SET default_value = '31,013,557' WHERE template_id = 'bni_bwp_v1' AND excel_column = 'Current Account Balance';
UPDATE template_columns SET default_value = '19,433,110,602' WHERE template_id = 'bni_bwp_v1' AND excel_column = 'Total Credits (12 Months)';
UPDATE template_columns SET default_value = NULL WHERE template_id = 'bni_bwp_v1' AND excel_column = 'Days Past Due';
UPDATE template_columns SET default_value = 'Muhammad Ashraf' WHERE template_id = 'bni_bwp_v1' AND excel_column = 'Senior RM/RM';
UPDATE template_columns SET default_value = 'Arif Suryono' WHERE template_id = 'bni_bwp_v1' AND excel_column = 'CMC Head';
UPDATE template_columns SET default_value = 'Dumana Saurma' WHERE template_id = 'bni_bwp_v1' AND excel_column = 'Department Head';

-- Columns 51-60
UPDATE template_columns SET default_value = 'Yusica Andriani' WHERE template_id = 'bni_bwp_v1' AND excel_column = 'Business Analyst';
UPDATE template_columns SET default_value = 'COMMERCIAL' WHERE template_id = 'bni_bwp_v1' AND excel_column = 'Customer Segment';
UPDATE template_columns SET default_value = 'Komplek Graha Mas Fatmawati Blok A 25-26' WHERE template_id = 'bni_bwp_v1' AND excel_column = 'Address Line 1';
UPDATE template_columns SET default_value = 'JI. RS Fatmawati No 71 Jakarta Selatan Prov. DKI Jakarta' WHERE template_id = 'bni_bwp_v1' AND excel_column = 'Address Line 2';
UPDATE template_columns SET default_value = 'DKI Jakarta' WHERE template_id = 'bni_bwp_v1' AND excel_column = 'Province';
UPDATE template_columns SET default_value = 'Jakarta Selatan' WHERE template_id = 'bni_bwp_v1' AND excel_column = 'City/Country';
UPDATE template_columns SET default_value = '50%' WHERE template_id = 'bni_bwp_v1' AND excel_column = 'Percent of Business';
UPDATE template_columns SET default_value = 'PT Vitrama Indo Part merupakan perusahaan milik Key Person,Sebelumnya saham dimiliki oleh PT Vitrama Communication (PT Vitracom). Perusahaan tersebut sudah tidak beroperasi sehingga data tidak ditemukan di AHU.' WHERE template_id = 'bni_bwp_v1' AND excel_column = 'Description';
UPDATE template_columns SET default_value = 'Debitur' WHERE template_id = 'bni_bwp_v1' AND excel_column = 'Customer Relationship';
UPDATE template_columns SET default_value = 'Direktur' WHERE template_id = 'bni_bwp_v1' AND excel_column = 'Relationship Type';

-- Columns 61-70
UPDATE template_columns SET default_value = 'Direktur' WHERE template_id = 'bni_bwp_v1' AND excel_column = 'Designation/Position';
UPDATE template_columns SET default_value = '30 years' WHERE template_id = 'bni_bwp_v1' AND excel_column = 'Industry Experience';
UPDATE template_columns SET default_value = 'Izin usaha PT Bumiwama Agungperkasa (PT BWAP) berupa: IUP tidak diperpanjang' WHERE template_id = 'bni_bwp_v1' AND excel_column = 'Main Risk';
UPDATE template_columns SET default_value = '32 years' WHERE template_id = 'bni_bwp_v1' AND excel_column = 'Length of the Service';
UPDATE template_columns SET default_value = 'PT Mitra Ciasem Raya' WHERE template_id = 'bni_bwp_v1' AND excel_column = 'Buyer or Supplier Name';
UPDATE template_columns SET default_value = 'Batu boulder, batu belah 15-30cm, Abu batu' WHERE template_id = 'bni_bwp_v1' AND excel_column = 'Product Type';
UPDATE template_columns SET default_value = 'KK.001/PRSTBN/III/2023' WHERE template_id = 'bni_bwp_v1' AND excel_column = 'Number of Contract & Period';
UPDATE template_columns SET default_value = '7.045' WHERE template_id = 'bni_bwp_v1' AND excel_column = 'Average Sales Volume Per Month';
UPDATE template_columns SET default_value = '3 years' WHERE template_id = 'bni_bwp_v1' AND excel_column = 'Partnership Duration (Year)';
UPDATE template_columns SET default_value = '5' WHERE template_id = 'bni_bwp_v1' AND excel_column = 'Payment Period (Day)';

-- Columns 71-80
UPDATE template_columns SET default_value = '50% 50%' WHERE template_id = 'bni_bwp_v1' AND excel_column = 'Percentages To Sales';
UPDATE template_columns SET default_value = 'No' WHERE template_id = 'bni_bwp_v1' AND excel_column = 'Prohibited Industry';
UPDATE template_columns SET default_value = 'Yes' WHERE template_id = 'bni_bwp_v1' AND excel_column = 'High Risk Industry';
UPDATE template_columns SET default_value = 'No' WHERE template_id = 'bni_bwp_v1' AND excel_column = 'Prior Business Bankruptcy';
UPDATE template_columns SET default_value = 'No' WHERE template_id = 'bni_bwp_v1' AND excel_column = 'Tax Liens/Obligations Outstanding';
UPDATE template_columns SET default_value = 'PT BWAP sudah tidak dapat beroperasi karena tidak memiliki izin operasi tambang batu split. Operasi tambang batu split akan dilanjutkan oleh Grup Usaha yaitu PT TBN.' WHERE template_id = 'bni_bwp_v1' AND excel_column = 'Business Status';
UPDATE template_columns SET default_value = '29 April 2025' WHERE template_id = 'bni_bwp_v1' AND excel_column = 'Last Review';
UPDATE template_columns SET default_value = '23 April 2026' WHERE template_id = 'bni_bwp_v1' AND excel_column = 'Next Review';
UPDATE template_columns SET default_value = '12  months' WHERE template_id = 'bni_bwp_v1' AND excel_column = 'Review Frequency';
UPDATE template_columns SET default_value = '12 months' WHERE template_id = 'bni_bwp_v1' AND excel_column = 'Review Frequency Type';

-- Columns 81-86
UPDATE template_columns SET default_value = 'Direktur' WHERE template_id = 'bni_bwp_v1' AND excel_column = 'Contact Type';
UPDATE template_columns SET default_value = 'Rizard Amry' WHERE template_id = 'bni_bwp_v1' AND excel_column = 'Contact Name';
UPDATE template_columns SET default_value = 'Direktur' WHERE template_id = 'bni_bwp_v1' AND excel_column = 'Title/Position';
UPDATE template_columns SET default_value = 'PT Bumiwarna Agungperkasa (PT BWAP)' WHERE template_id = 'bni_bwp_v1' AND excel_column = 'Company Name';
UPDATE template_columns SET default_value = 'No' WHERE template_id = 'bni_bwp_v1' AND excel_column = 'Is Primary Contact';
UPDATE template_columns SET default_value = 'PT Bumiwarna dalam kondisi kolektibilitas 1 (lancar). Fasilitas kredit Bpk. Rizard memiliki kolektibilitas 5.' WHERE template_id = 'bni_bwp_v1' AND excel_column = 'Contact Notes / Additional Comments';

-- Verify the updates
SELECT excel_column, default_value 
FROM template_columns 
WHERE template_id = 'bni_bwp_v1' 
ORDER BY column_number;
