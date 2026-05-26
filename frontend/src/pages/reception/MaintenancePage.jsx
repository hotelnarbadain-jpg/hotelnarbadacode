import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faScrewdriverWrench } from '@fortawesome/free-solid-svg-icons';

export default function MaintenancePage({ title }) {
  return (
    <div className="flex h-[70vh] flex-col items-center justify-center text-center">
      <div className="mb-6 grid h-24 w-24 place-content-center rounded-full bg-slate-100 text-[40px] text-slate-400">
        <FontAwesomeIcon icon={faScrewdriverWrench} />
      </div>
      <h2 className="text-[24px] font-extrabold text-slate-800 uppercase tracking-tight">
        {title} Under Maintenance
      </h2>
      <p className="mt-3 max-w-sm text-[14px] font-medium text-slate-500">
        This module is currently disabled or undergoing active maintenance. Check back later!
      </p>
    </div>
  );
}
