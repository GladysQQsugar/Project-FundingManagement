<!-- 基金项目可视化管理系统 -->
<template>
  <el-container class="layout-container" v-loading="isLoading" :element-loading-text="loadingText">
    <!-- 左侧菜单栏 -->
    <el-aside 
      :width="(isMobile && !isMobileMenuOpen) ? '0px' : (isCollapsed ? '64px' : '280px')" 
      class="aside transition-all duration-300 relative"
      :class="{ 'mobile-sidebar': isMobile, 'mobile-open': isMobileMenuOpen }"
    >
      <div class="logo">
        <el-icon :size="24" color="#fff" class="shrink-0"><DataAnalysis /></el-icon>
        <span v-show="!isCollapsed || isMobile" class="logo-title">XX集团基金矩阵</span>
      </div>

      <!-- 收起/展开切换按钮 (桌面端) -->
      <div v-if="!isMobile" class="collapse-btn" @click="isCollapsed = !isCollapsed">
        <el-icon :size="20">
          <component :is="isCollapsed ? 'Expand' : 'Fold'" />
        </el-icon>
      </div>

      <el-menu
        :default-active="activeMenu"
        class="el-menu-vertical"
        :collapse="isCollapsed && !isMobile"
        :collapse-transition="true"
        background-color="#001529"
        text-color="#ffffff"
        active-text-color="#409eff"
        @select="handleMenuSelect"
      >
        <el-menu-item index="overview">
          <el-icon><Monitor /></el-icon>
          <span>首页总览</span>
        </el-menu-item>
        <el-menu-item index="library">
          <el-icon><Fold /></el-icon>
          <span>项目库</span>
        </el-menu-item>
        <el-menu-item index="invested">
          <el-icon><Coin /></el-icon>
          <span>已投项目</span>
        </el-menu-item>
        <el-menu-item index="exited">
          <el-icon><Collection /></el-icon>
          <span>已退出项目</span>
        </el-menu-item>
        <el-menu-item index="importExport">
          <el-icon><Download /></el-icon>
          <span>数据导入导出</span>
        </el-menu-item>
        <el-menu-item index="dictionary">
          <el-icon><Collection /></el-icon>
          <span>系统字典</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <!-- 手机端遮罩 -->
    <div v-if="isMobile && isMobileMenuOpen" class="mobile-mask" @click="isMobileMenuOpen = false"></div>

    <el-container class="main-container">
      <!-- 顶部标题区 -->
      <el-header class="header">
        <div class="header-left flex items-center">
          <el-button 
            v-if="isMobile" 
            link 
            class="mr-2" 
            @click="isMobileMenuOpen = true"
          >
            <el-icon :size="24"><Grid /></el-icon>
          </el-button>
          <h2 class="title">{{ menuTitle }}</h2>
        </div>
        <div class="header-right text-right">
          <el-tag effect="plain" type="info" class="update-time">更新时间: {{ lastUpdateTime }}</el-tag>
          <el-badge :value="projects.length" type="primary">
            <span class="text-gray-600 font-medium total-count">项目总数</span>
          </el-badge>
        </div>
      </el-header>

      <!-- 主要内容区 -->
      <el-main class="main-content">
        <!-- 首页总览 -->
        <div v-if="activeMenu === 'overview'" :key="activeMenu" class="fade-in">
          <!-- 统计卡片与摘要 -->
          <el-row :gutter="20" class="mb-4">
            <el-col :span="24">
              <el-card shadow="never" class="bg-blue-50 border-blue-100">
                <template #header>
                  <div class="flex items-center justify-between flex-wrap gap-2">
                    <div class="flex items-center text-blue-900 font-bold min-w-[140px]">
                      <el-icon class="mr-2"><InfoFilled /></el-icon>
                      管理驾驶舱摘要
                    </div>
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="text-xs text-gray-500 font-normal">周期:</span>
                      <el-date-picker
                        v-model="filters.summaryStart"
                        type="month"
                        value-format="YYYY-MM"
                        format="YYYY年M月"
                        placeholder="起"
                        size="small"
                        style="width: 100px"
                      />
                      <span class="text-gray-400">-</span>
                      <el-date-picker
                        v-model="filters.summaryEnd"
                        type="month"
                        value-format="YYYY-MM"
                        format="YYYY年M月"
                        placeholder="止"
                        size="small"
                        style="width: 100px"
                      />
                      <el-button size="small" type="primary" plain @click="filters.summaryStart=''; filters.summaryEnd=''" :icon="Refresh">重置</el-button>
                    </div>
                  </div>
                </template>
                <div class="text-blue-900 leading-relaxed indent-8 text-sm md:text-base">
                  {{ summaryText }}
                </div>
              </el-card>
            </el-col>
          </el-row>

          <el-row :gutter="20" class="mb-2 md:mb-6">
            <el-col :xs="12" :sm="12" :md="6" v-for="card in statCards" :key="card.label" class="mb-4">
              <el-card shadow="hover" class="stat-card">
                <div class="stat-content">
                  <div class="stat-label">{{ card.label }}</div>
                  <div class="stat-value" :style="{ color: card.color }">{{ card.value }}</div>
                </div>
              </el-card>
            </el-col>
          </el-row>

          <!-- 图表展示 -->
          <el-row :gutter="20">
            <el-col :xs="24" :sm="12" :md="8" v-for="chart in dashboardCharts" :key="chart.id" class="mb-6">
              <el-card shadow="hover">
                <template #header>
                  <div class="flex justify-between items-center">
                    <span class="text-sm font-bold">{{ chart.title }}</span>
                    <el-button link type="primary" :icon="Refresh" @click="openZoomDialog(chart)">放大</el-button>
                  </div>
                </template>
                <div :id="chart.id" class="chart-container-mini"></div>
              </el-card>
            </el-col>
          </el-row>
        </div>

        <!-- 项目库 -->
        <div v-else-if="activeMenu === 'library'" :key="activeMenu" class="fade-in">
          <!-- 统计快报 -->
          <el-row :gutter="20" class="mb-4">
            <el-col :span="24">
              <div class="grid grid-cols-2 lg:grid-cols-5 gap-3">
                <el-card v-for="item in libraryStats" :key="item.label" shadow="never" class="text-center py-1 border-slate-100 bg-slate-50/50">
                  <div class="text-[10px] md:text-xs text-gray-500 mb-1">{{ item.label }}</div>
                  <div class="text-base md:text-xl font-bold font-mono" :class="item.class">{{ item.value }}</div>
                </el-card>
              </div>
            </el-col>
          </el-row>

          <el-card class="mb-4 filter-container">
            <!-- 筛选条 -->
            <el-form :inline="!isMobile" :model="filters" size="default" class="flex flex-wrap gap-y-4 filter-form-mobile">
              <el-form-item label="关键词" class="mobile-full">
                <el-input v-model="filterKeyword" placeholder="名称/企业/进展" clearable class="mobile-full-input" style="width: 240px" />
              </el-form-item>
              <el-form-item label="所属基金" class="mobile-full">
                <el-select v-model="filters.fund" placeholder="全部" clearable @change="handleFilter" class="mobile-full-input" style="width: 160px">
                  <el-option v-for="item in dicts.funds" :key="item" :label="item" :value="item" />
                </el-select>
              </el-form-item>
              <el-form-item label="当前阶段" class="mobile-full">
                <el-select v-model="filters.stage" placeholder="全部" clearable @change="handleFilter" class="mobile-full-input" style="width: 150px">
                  <el-option v-for="item in dicts.stages" :key="item" :label="item" :value="item" />
                </el-select>
              </el-form-item>
              <el-form-item label="965大类" class="mobile-full">
                <el-select v-model="filters.industry965Category" placeholder="全部" clearable @change="handle965FilterChange" class="mobile-full-input" style="width: 160px">
                  <el-option v-for="item in dicts.industry965Categories" :key="item" :label="item" :value="item" />
                </el-select>
              </el-form-item>
              <el-form-item label="产业方向" class="mobile-full">
                <el-select v-model="filters.industry965Direction" placeholder="全部" clearable @change="handleFilter" class="mobile-full-input" style="width: 180px">
                  <el-option v-for="item in availableDirectionsForFilter" :key="item" :label="item" :value="item" />
                </el-select>
              </el-form-item>
              <el-form-item label="重点推进" class="mobile-half">
                <el-select v-model="filters.isKey" placeholder="全部" clearable @change="handleFilter" class="mobile-full-input" style="width: 100px">
                  <el-option v-for="item in dicts.isKeyOptions" :key="item" :label="item" :value="item" />
                </el-select>
              </el-form-item>
              <el-form-item label="疑似重复" class="mobile-half">
                <el-select v-model="filters.isDuplicate" placeholder="全部" clearable @change="handleFilter" class="mobile-full-input" style="width: 100px">
                  <el-option label="是" value="是" />
                  <el-option label="否" value="否" />
                </el-select>
              </el-form-item>
              <el-form-item label="收集年月" class="mobile-full">
                <div class="flex items-center gap-1">
                  <el-date-picker
                    v-model="filters.collectMonthStart"
                    type="month"
                    value-format="YYYY-MM"
                    format="YYYY年M月"
                    placeholder="开始"
                    style="width: 130px"
                    @change="handleFilter"
                  />
                  <span class="text-gray-400">至</span>
                  <el-date-picker
                    v-model="filters.collectMonthEnd"
                    type="month"
                    value-format="YYYY-MM"
                    format="YYYY年M月"
                    placeholder="截止"
                    style="width: 130px"
                    @change="handleFilter"
                  />
                </div>
              </el-form-item>
              <el-form-item class="filter-actions md:ml-auto">
                <div class="flex flex-wrap gap-2">
                  <el-button type="primary" plain icon="Filter" @click="filterUnclassified">未分类</el-button>
                  <el-button type="primary" @click="openProjectDialog()">新增</el-button>
                  <el-button @click="resetFilters">重置</el-button>
                  <el-button type="success" @click="exportFilteredData">导出结果</el-button>
                </div>
              </el-form-item>
            </el-form>
          </el-card>

          <!-- 数据表格 -->
          <el-card shadow="hover" class="table-card">
            <div class="table-wrapper">
              <el-table 
                :data="pagedProjects" 
                stripe 
                border 
                scrollbar-always-on 
                style="width: 100%" 
                height="calc(100vh - 420px)"
                :min-width="1200"
              >
              <el-table-column prop="name" label="项目名称" width="200" fixed />
              <el-table-column prop="company" label="企业名称" width="180" />
              <el-table-column prop="fund" label="所属基金" width="180">
                <template #default="scope">
                  {{ scope.row._fundNames.join('、') }}
                </template>
              </el-table-column>
              <el-table-column prop="stage" label="当前阶段" min-width="150">
                <template #default="scope">
                  <el-tag :type="getStageTagType(scope.row.stage)" class="whitespace-nowrap">{{ scope.row.stage }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="isKey" label="重点推进" width="100">
                <template #default="scope">
                  <span :class="scope.row.isKey === '是' ? 'text-red-600 font-bold' : ''">{{ scope.row.isKey }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="source" label="来源" width="120" />
              <el-table-column prop="year" label="收集年月" width="120" align="center">
                <template #default="scope">
                  {{ formatCollectMonthCN(scope.row.year) }}
                </template>
              </el-table-column>
              <el-table-column prop="industry965Category" label="965大类" width="150" />
              <el-table-column prop="industry965Direction" label="965产业方向" width="160" />
              <el-table-column label="疑似重复" width="100" align="center">
                <template #default="scope">
                  <el-tag v-if="scope.row._isDuplicate" type="danger" effect="dark" size="small">疑似重复</el-tag>
                  <span v-else class="text-gray-400">-</span>
                </template>
              </el-table-column>
              <el-table-column prop="manager" label="负责人" width="100" />
              <el-table-column prop="priority" label="优先级" width="100">
                <template #default="scope">
                  <el-tag v-if="scope.row.priority" :type="getPriorityTagType(scope.row.priority)" size="small">
                    {{ scope.row.priority }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="progress" label="进展" min-width="200" show-overflow-tooltip />
              <el-table-column label="操作" width="150" fixed="right">
                <template #default="scope">
                  <el-button link type="primary" @click="openProjectDialog(scope.row)">编辑</el-button>
                  <el-button link type="danger" @click="handleDelete(scope.row)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>
            <div class="pagination-container">
              <el-pagination
                v-model:current-page="currentPage"
                v-model:page-size="pageSize"
                :page-sizes="[10, 20, 50, 100]"
                layout="total, sizes, prev, pager, next, jumper"
                :total="filteredProjects.length"
              />
            </div>
          </div>
        </el-card>
      </div>

        <!-- 已投项目 -->
        <div v-else-if="activeMenu === 'invested'" :key="activeMenu" class="fade-in">
          <el-row :gutter="16" class="mb-4">
            <el-col :xs="12" :sm="6" :lg="3" v-for="item in investedStats" :key="item.label" class="mb-4">
              <el-card shadow="never" class="invested-stat-card">
                <div class="text-xs text-gray-500 mb-1">{{ item.label }}</div>
                <div class="invested-stat-value" :style="{ color: item.color }">{{ item.value }}</div>
              </el-card>
            </el-col>
          </el-row>

          <el-card class="mb-4 filter-container">
            <el-form :inline="!isMobile" size="default" class="flex flex-wrap gap-y-4 filter-form-mobile">
              <el-form-item label="关键词" class="mobile-full">
                <el-input v-model="investedFilters.keyword" placeholder="项目/企业/负责人/经营进展/备注" clearable class="mobile-full-input" style="width: 260px" />
              </el-form-item>
              <el-form-item label="所属基金" class="mobile-full">
                <el-select v-model="investedFilters.fund" placeholder="全部" clearable class="mobile-full-input" style="width: 170px">
                  <el-option v-for="item in dicts.funds" :key="item" :label="item" :value="item" />
                </el-select>
              </el-form-item>
              <el-form-item label="投资状态" class="mobile-full">
                <el-select v-model="investedFilters.stage" placeholder="全部" clearable class="mobile-full-input" style="width: 160px">
                  <el-option label="已投决待交割" value="已投决待交割" />
                  <el-option label="已交割" value="已交割" />
                </el-select>
              </el-form-item>
              <el-form-item label="965大类" class="mobile-full">
                <el-select v-model="investedFilters.industry965Category" placeholder="全部" clearable class="mobile-full-input" style="width: 160px" @change="handleInvestedCategoryChange">
                  <el-option v-for="item in dicts.industry965Categories" :key="item" :label="item" :value="item" />
                </el-select>
              </el-form-item>
              <el-form-item label="产业方向" class="mobile-full">
                <el-select v-model="investedFilters.industry965Direction" placeholder="全部" clearable class="mobile-full-input" style="width: 180px">
                  <el-option v-for="item in availableInvestedDirections" :key="item" :label="item" :value="item" />
                </el-select>
              </el-form-item>
              <el-form-item label="注册地" class="mobile-full">
                <el-select v-model="investedFilters.location" placeholder="全部" filterable clearable allow-create class="mobile-full-input" style="width: 130px">
                  <el-option v-for="item in investedLocationOptions" :key="item" :label="item" :value="item" />
                </el-select>
              </el-form-item>
              <el-form-item label="在汉注册" class="mobile-half">
                <el-select v-model="investedFilters.registeredInWuhan" placeholder="全部" clearable class="mobile-full-input" style="width: 110px">
                  <el-option label="是" value="是" />
                  <el-option label="否" value="否" />
                </el-select>
              </el-form-item>
              <el-form-item label="在汉纳税" class="mobile-half">
                <el-select v-model="investedFilters.taxedInWuhan" placeholder="全部" clearable class="mobile-full-input" style="width: 110px">
                  <el-option label="是" value="是" />
                  <el-option label="否" value="否" />
                </el-select>
              </el-form-item>
              <el-form-item class="filter-actions md:ml-auto">
                <div class="flex flex-wrap gap-2">
                  <el-button @click="resetInvestedFilters">重置</el-button>
                  <el-button type="success" @click="exportInvestedData">导出已投资料</el-button>
                </div>
              </el-form-item>
            </el-form>
          </el-card>

          <el-row :gutter="20" class="mb-4">
            <el-col :xs="24" :sm="12" :lg="6" v-for="chart in investedCharts" :key="chart.id" class="mb-4">
              <el-card shadow="hover">
                <template #header>
                  <div class="flex justify-between items-center">
                    <span class="text-sm font-bold">{{ chart.title }}</span>
                  </div>
                </template>
                <div :id="chart.id" class="invested-chart-container"></div>
              </el-card>
            </el-col>
          </el-row>

          <el-empty v-if="!investedProjects.length" description="暂无已投项目资料">
            <el-button type="primary" @click="activeMenu = 'library'">去项目库维护阶段</el-button>
          </el-empty>

          <div v-else>
            <el-card shadow="hover" class="invested-list-card">
              <template #header>
                <div class="invested-card-header">
                  <span>已投项目清单</span>
                  <el-tag type="info" effect="plain">{{ investedProjects.length }} 项</el-tag>
                </div>
              </template>
              <div class="invested-project-grid">
                <button
                  v-for="item in investedProjects"
                  :key="item.id"
                  class="invested-project-item"
                  @click="selectInvestedProject(item)"
                >
                  <div class="invested-project-main">
                    <span class="invested-project-name">{{ item.name || '未命名项目' }}</span>
                    <el-tag :type="getStageTagType(item.stage)" size="small">{{ item.stage }}</el-tag>
                  </div>
                  <div class="invested-project-sub">{{ item.company || '企业名称未填写' }}</div>
                  <div class="invested-project-meta">
                    <span>{{ item._fundNames?.join('、') || item.fund || '待定' }}</span>
                    <span>最新估值：{{ displayValue(item.latestValuation) }}</span>
                  </div>
                  <div class="invested-project-meta mt-1">
                    <span>估值变化</span>
                    <span class="valuation-change" :class="getValuationChangeClass(item)">{{ formatValuationChangeRatio(item) }}</span>
                  </div>
                </button>
              </div>
            </el-card>
          </div>
        </div>

        <!-- 已退出项目 -->
        <div v-else-if="activeMenu === 'exited'" :key="activeMenu" class="fade-in">
          <el-row :gutter="16" class="mb-4">
            <el-col :xs="12" :sm="6" v-for="item in exitedStats" :key="item.label" class="mb-4">
              <el-card shadow="never" class="invested-stat-card">
                <div class="text-xs text-gray-500 mb-1">{{ item.label }}</div>
                <div class="invested-stat-value" :style="{ color: item.color }">{{ item.value }}</div>
              </el-card>
            </el-col>
          </el-row>

          <el-card class="mb-4 filter-container">
            <el-form :inline="!isMobile" size="default" class="flex flex-wrap gap-y-4 filter-form-mobile">
              <el-form-item label="关键词" class="mobile-full">
                <el-input v-model="exitedFilters.keyword" placeholder="项目/企业/退出方式/备注" clearable class="mobile-full-input" style="width: 260px" />
              </el-form-item>
              <el-form-item label="所属基金" class="mobile-full">
                <el-select v-model="exitedFilters.fund" placeholder="全部" clearable class="mobile-full-input" style="width: 170px">
                  <el-option v-for="item in dicts.funds" :key="item" :label="item" :value="item" />
                </el-select>
              </el-form-item>
              <el-form-item class="filter-actions md:ml-auto">
                <div class="flex flex-wrap gap-2">
                  <el-button @click="resetExitedFilters">重置</el-button>
                </div>
              </el-form-item>
            </el-form>
          </el-card>

          <el-empty v-if="!exitedProjects.length" description="暂无已退出项目">
            <el-button type="primary" @click="activeMenu = 'library'">去项目库维护阶段</el-button>
          </el-empty>

          <el-card v-else shadow="hover" class="table-card">
            <el-table :data="exitedProjects" stripe border style="width: 100%">
              <el-table-column prop="name" label="项目名称" min-width="180" fixed />
              <el-table-column prop="company" label="企业名称" min-width="160" />
              <el-table-column label="所属基金" min-width="180">
                <template #default="scope">{{ scope.row._fundNames?.join('、') || scope.row.fund || '待定' }}</template>
              </el-table-column>
              <el-table-column label="退出时间" width="130">
                <template #default="scope">{{ formatDateCN(scope.row.exitDate) || '-' }}</template>
              </el-table-column>
              <el-table-column prop="exitMethod" label="退出方式" width="130" />
              <el-table-column label="投资金额" width="130">
                <template #default="scope">{{ displayValue(scope.row.investmentAmount || scope.row.amount) }}</template>
              </el-table-column>
              <el-table-column label="退出金额" width="130">
                <template #default="scope">{{ displayValue(scope.row.exitAmount) }}</template>
              </el-table-column>
              <el-table-column label="退出收益" width="130">
                <template #default="scope">
                  <span class="valuation-change" :class="getExitIncomeClass(scope.row)">{{ formatExitIncome(scope.row) }}</span>
                </template>
              </el-table-column>
              <el-table-column label="收益率" width="110">
                <template #default="scope">
                  <span class="valuation-change" :class="getExitIncomeClass(scope.row)">{{ formatExitReturnRatio(scope.row) }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="exitRemark" label="退出备注" min-width="220" show-overflow-tooltip />
              <el-table-column label="操作" width="100" fixed="right">
                <template #default="scope">
                  <el-button link type="primary" @click="openProjectDialog(scope.row)">编辑</el-button>
                </template>
              </el-table-column>
            </el-table>
          </el-card>
        </div>

        <!-- 导入导出 -->
        <div v-else-if="activeMenu === 'importExport'" :key="activeMenu" class="fade-in">
          <div class="io-grid">
            <el-card shadow="hover" class="io-card">
              <template #header>
                <div class="io-card-header-row">
                  <span class="io-card-icon"><el-icon><Download /></el-icon></span>
                  <div class="io-card-header">数据导出</div>
                </div>
              </template>
              <div class="io-card-body">
                <p class="io-description">将系统内所有已保存的项目数据下载为 CSV 文件。</p>
                <div class="io-action-area">
                  <el-button type="primary" size="large" @click="exportData(true)" class="px-10">
                    <el-icon class="mr-2"><Download /></el-icon> 导出全部项目 (CSV)
                  </el-button>
                </div>
                <div class="io-meta-text">当前项目记录 {{ projects.length }} 条</div>
              </div>
            </el-card>

            <el-card shadow="hover" class="io-card">
              <template #header>
                <div class="io-card-header-row">
                  <span class="io-card-icon success"><el-icon><Upload /></el-icon></span>
                  <div class="io-card-header">数据导入</div>
                </div>
              </template>
              <div class="io-card-body">
                <p class="io-description">批量导入项目到系统（支持 CSV 格式）。</p>
                <div class="io-action-area">
                  <el-button type="success" size="large" @click="triggerImport" class="px-10">
                    <el-icon class="mr-2"><Upload /></el-icon> 上传 CSV 文件
                  </el-button>
                </div>
                <input type="file" ref="fileInput" class="hidden" accept=".csv" @change="handleFileUpload" />
                <div class="io-meta-text">
                  <el-link type="primary" class="font-medium" @click="downloadTemplate">下载测试模板.csv</el-link>
                </div>
              </div>
            </el-card>
          </div>

          <div class="mt-6">
            <el-card shadow="hover">
              <template #header><div class="io-card-header">系统维护</div></template>
              <div class="p-8 flex justify-center gap-12">
                <el-button type="danger" plain size="large" @click="clearAllData">
                  <el-icon class="mr-2"><Delete /></el-icon> 清空全部数据
                </el-button>
                <el-button type="info" plain size="large" @click="resetToMock">
                  <el-icon class="mr-2"><RefreshRight /></el-icon> 重置为示例数据
                </el-button>
              </div>
            </el-card>
          </div>
        </div>

        <!-- 字典视图 -->
        <div v-else-if="activeMenu === 'dictionary'" :key="activeMenu" class="fade-in">
          <el-row :gutter="20">
            <el-col :xs="24" :sm="12" v-for="(list, key) in displayDicts" :key="key" class="mb-4">
              <el-card shadow="hover" class="h-full">
                <template #header>
                  <div class="dictionary-card-header">
                    <div class="font-bold">{{ dictLabels[key] }}</div>
                    <el-button v-if="key === 'funds'" type="primary" plain size="small" :icon="Plus" @click="addFundOption">
                      添加基金
                    </el-button>
                  </div>
                </template>
                <div v-if="key === 'funds'" class="dictionary-fund-list">
                  <el-tag v-for="item in list" :key="item" type="info" effect="plain" class="editable-fund-tag">
                    <span>{{ item }}</span>
                    <el-button :icon="Edit" text circle size="small" @click.stop="renameFundOption(item)" />
                    <el-button :icon="Delete" text circle size="small" @click.stop="deleteFundOption(item)" />
                  </el-tag>
                </div>
                <div v-else class="flex flex-wrap gap-2">
                  <el-tag v-for="item in list" :key="item" type="info">{{ item }}</el-tag>
                </div>
              </el-card>
            </el-col>
          </el-row>
        </div>
      </el-main>
    </el-container>

    <!-- 已投项目详情弹窗 -->
    <el-dialog
      v-model="investedDetailDialogVisible"
      :title="selectedInvestedProject?.name || '已投项目详情'"
      :width="isMobile ? '95%' : '1100px'"
      top="5vh"
      destroy-on-close
    >
      <div v-if="selectedInvestedProject" class="dialog-body">
        <div class="invested-detail-header mb-4">
          <div>
            <div class="invested-detail-title">{{ selectedInvestedProject.name }}</div>
            <div class="invested-detail-company">{{ selectedInvestedProject.company || '企业名称未填写' }}</div>
          </div>
          <div class="invested-detail-actions">
            <el-button type="primary" plain @click="openProjectDialog(selectedInvestedProject)">编辑资料</el-button>
          </div>
        </div>

        <div class="invested-detail-section-title">基本资料</div>
        <el-descriptions :column="isMobile ? 1 : 3" border class="mb-4">
          <el-descriptions-item label="项目名称">{{ displayValue(selectedInvestedProject.name) }}</el-descriptions-item>
          <el-descriptions-item label="企业名称">{{ displayValue(selectedInvestedProject.company) }}</el-descriptions-item>
          <el-descriptions-item label="所属基金">{{ selectedInvestedProject._fundNames?.join('、') || selectedInvestedProject.fund || '待定' }}</el-descriptions-item>
          <el-descriptions-item label="投资状态">
            <el-tag :type="getStageTagType(selectedInvestedProject.stage)">{{ selectedInvestedProject.stage }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="注册地">{{ displayValue(selectedInvestedProject.location) }}</el-descriptions-item>
          <el-descriptions-item label="办公地">{{ displayValue(selectedInvestedProject.officeLocation) }}</el-descriptions-item>
          <el-descriptions-item label="965大类">{{ displayValue(selectedInvestedProject.industry965Category) }}</el-descriptions-item>
          <el-descriptions-item label="产业方向">{{ displayValue(selectedInvestedProject.industry965Direction) }}</el-descriptions-item>
          <el-descriptions-item label="细分领域">{{ displayValue(selectedInvestedProject.subField) }}</el-descriptions-item>
        </el-descriptions>

        <div class="invested-detail-section-title">投资与估值</div>
        <el-descriptions :column="isMobile ? 1 : 3" border class="mb-4">
          <el-descriptions-item label="投资金额">{{ displayValue(selectedInvestedProject.investmentAmount || selectedInvestedProject.amount) }}</el-descriptions-item>
          <el-descriptions-item label="持股比例">{{ displayValue(selectedInvestedProject.shareholdingRatio) }}</el-descriptions-item>
          <el-descriptions-item label="投资时间">{{ displayValue(formatCollectMonthCN(selectedInvestedProject.investmentDate) || selectedInvestedProject.investmentDate) }}</el-descriptions-item>
          <el-descriptions-item label="交割时间">{{ displayValue(formatDateCN(selectedInvestedProject.closingDate)) }}</el-descriptions-item>
          <el-descriptions-item label="初始投后估值">{{ displayValue(selectedInvestedProject.initialPostValuation) }}</el-descriptions-item>
          <el-descriptions-item label="最新估值">{{ displayValue(selectedInvestedProject.latestValuation) }}</el-descriptions-item>
          <el-descriptions-item label="估值变化金额">
            <span class="valuation-change" :class="getValuationChangeClass(selectedInvestedProject)">{{ formatValuationChangeAmount(selectedInvestedProject) }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="估值变化比例">
            <span class="valuation-change" :class="getValuationChangeClass(selectedInvestedProject)">{{ formatValuationChangeRatio(selectedInvestedProject) }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="估值更新时间">{{ displayValue(formatCollectMonthCN(selectedInvestedProject.valuationUpdateDate) || selectedInvestedProject.valuationUpdateDate) }}</el-descriptions-item>
        </el-descriptions>

        <div class="invested-detail-section-title">人才与企业数据</div>
        <el-descriptions :column="isMobile ? 1 : 4" border class="mb-4">
          <el-descriptions-item label="服务人才数量">{{ displayValue(selectedInvestedProject.servedTalentCount) }}</el-descriptions-item>
          <el-descriptions-item label="企业员工总数">{{ displayValue(selectedInvestedProject.employeeCount) }}</el-descriptions-item>
          <el-descriptions-item label="科研人员数量">{{ displayValue(selectedInvestedProject.researcherCount) }}</el-descriptions-item>
          <el-descriptions-item label="高层次人才数量">{{ displayValue(selectedInvestedProject.highLevelTalentCount) }}</el-descriptions-item>
          <el-descriptions-item label="博士人数">{{ displayValue(selectedInvestedProject.doctorCount) }}</el-descriptions-item>
          <el-descriptions-item label="硕士人数">{{ displayValue(selectedInvestedProject.masterCount) }}</el-descriptions-item>
          <el-descriptions-item label="是否在汉注册">{{ displayValue(selectedInvestedProject.registeredInWuhan) }}</el-descriptions-item>
          <el-descriptions-item label="是否在汉纳税">{{ displayValue(selectedInvestedProject.taxedInWuhan) }}</el-descriptions-item>
        </el-descriptions>

        <div class="invested-detail-section-title">投后跟踪</div>
        <div class="invested-section">
          <div class="invested-section-title">最新经营进展</div>
          <div class="invested-section-content">{{ selectedInvestedProject.latestOperationProgress || selectedInvestedProject.progress || '暂无经营进展记录，请点击“编辑资料”补充。' }}</div>
        </div>
        <div class="invested-section">
          <div class="invested-section-title">投后服务事项</div>
          <div class="invested-section-content">{{ selectedInvestedProject.postInvestmentServices || '-' }}</div>
        </div>
        <div class="invested-section">
          <div class="invested-section-title">风险情况</div>
          <div class="invested-section-content">{{ selectedInvestedProject.riskStatus || '-' }}</div>
        </div>
        <div class="invested-section">
          <div class="invested-section-title">下一步计划</div>
          <div class="invested-section-content">{{ selectedInvestedProject.nextPlan || '-' }}</div>
        </div>
        <div class="invested-section">
          <div class="invested-section-title">最近更新时间 / 备注</div>
          <div class="invested-section-content">{{ displayValue(selectedInvestedProject.postLastUpdateDate) }}；{{ selectedInvestedProject.remark || '暂无备注。' }}</div>
        </div>
      </div>
    </el-dialog>

    <!-- 项目编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="form.id ? '编辑项目' : '新增项目'" :width="isMobile ? '95%' : '1000px'" top="5vh" :close-on-click-modal="false">
      <div class="dialog-body">
        <el-form :model="form" ref="formRef" :rules="formRules" :label-position="isMobile ? 'top' : 'right'" :label-width="isMobile ? 'auto' : '120px'">
          <el-divider content-position="left"><el-icon><InfoFilled /></el-icon> 基础信息</el-divider>
          <el-row :gutter="20">
            <el-col :xs="24" :sm="12">
              <el-form-item label="项目名称" prop="name">
                <el-input v-model="form.name" placeholder="请输入项目名称" />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12">
              <el-form-item label="企业名称">
                <el-input v-model="form.company" placeholder="请输入企业名称" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :xs="24" :sm="12">
              <el-form-item label="所属基金">
                <div class="fund-selector-stack">
                  <div v-for="(fund, index) in form.fundSelections" :key="`fund-${index}`" class="fund-selector-row">
                    <el-select
                      v-model="form.fundSelections[index]"
                      filterable
                      allow-create
                      default-first-option
                      placeholder="请选择或输入基金"
                      class="fund-select"
                      @change="handleFundSelectionChange(index)"
                    >
                      <el-option v-for="item in dicts.funds" :key="item" :label="item" :value="item" />
                    </el-select>
                    <el-button
                      :icon="Delete"
                      circle
                      :disabled="form.fundSelections.length === 1"
                      @click="removeFundSelect(index)"
                    />
                  </div>
                  <div class="selected-fund-tags" v-if="selectedFundTags.length">
                    <el-tag
                      v-for="item in selectedFundTags"
                      :key="item"
                      closable
                      type="info"
                      @close="removeFundTag(item)"
                    >
                      {{ item }}
                    </el-tag>
                  </div>
                  <el-button type="primary" plain :icon="Plus" @click="addFundSelect">添加选择栏</el-button>
                </div>
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12">
              <el-form-item label="当前阶段">
                <el-select v-model="form.stage" class="w-full">
                  <el-option v-for="item in dicts.stages" :key="item" :label="item" :value="item" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :xs="24" :sm="12">
              <el-form-item label="是否重点推进">
                <el-radio-group v-model="form.isKey">
                  <el-radio v-for="item in dicts.isKeyOptions" :key="item" :label="item" :value="item" />
                </el-radio-group>
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12">
              <el-form-item label="收集年月">
                <el-date-picker v-model="form.year" type="month" value-format="YYYY-MM" format="YYYY年M月" placeholder="选择收集年月" class="w-full" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :xs="24" :sm="12">
              <el-form-item label="项目来源">
                <el-select v-model="form.source" class="w-full">
                  <el-option v-for="item in dicts.sources" :key="item" :label="item" :value="item" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12">
              <el-form-item label="项目类型">
                <el-input v-model="form.type" placeholder="如：投早、成长等" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-divider content-position="left"><el-icon><Grid /></el-icon> 行业与分类</el-divider>

          <el-row :gutter="20">
            <el-col :xs="24" :sm="12">
              <el-form-item label="系统标准行业">
                <el-select v-model="form.standardIndustry" class="w-full">
                  <el-option v-for="item in dicts.standardIndustries" :key="item" :label="item" :value="item" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12">
              <el-form-item label="原始行业">
                <el-input v-model="form.originalIndustry" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :xs="24" :sm="12">
              <el-form-item label="965大类">
                <el-select v-model="form.industry965Category" @change="handle965CategoryChange" class="w-full">
                  <el-option v-for="item in dicts.industry965Categories" :key="item" :label="item" :value="item" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12">
              <el-form-item label="965产业方向">
                <el-select v-model="form.industry965Direction" class="w-full">
                  <el-option v-for="item in availableDirections" :key="item" :label="item" :value="item" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :xs="24" :sm="12">
              <el-form-item label="细分领域">
                <el-input v-model="form.subField" />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12">
              <el-form-item label="注册地">
                <el-input v-model="form.location" />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12">
              <el-form-item label="办公地">
                <el-input v-model="form.officeLocation" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-divider content-position="left"><el-icon><Coin /></el-icon> 融资与推进</el-divider>

          <el-row :gutter="20">
            <el-col :xs="24" :sm="12">
              <el-form-item label="融资轮次">
                <el-input v-model="form.round" />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12">
              <el-form-item label="本轮融资金额">
                <el-input v-model="form.amount" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :xs="24" :sm="12">
              <el-form-item label="项目负责人">
                <el-input v-model="form.manager" />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12">
              <el-form-item label="优先级">
                <el-select v-model="form.priority" class="w-full">
                  <el-option v-for="item in dicts.priorities" :key="item" :label="item" :value="item" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item label="当前进展">
            <el-input v-model="form.progress" type="textarea" :rows="3" />
          </el-form-item>

          <el-divider content-position="left"><el-icon><Coin /></el-icon> 投资与估值</el-divider>
          <el-row :gutter="20">
            <el-col :xs="24" :sm="12">
              <el-form-item label="投资金额">
                <el-input v-model="form.investmentAmount" placeholder="如：1500万元、2亿元" />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12">
              <el-form-item label="持股比例">
                <el-input v-model="form.shareholdingRatio" placeholder="如：6%" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="20">
            <el-col :xs="24" :sm="12">
              <el-form-item label="投资时间">
                <el-date-picker v-model="form.investmentDate" type="month" value-format="YYYY-MM" format="YYYY年M月" placeholder="选择投资时间" class="w-full" />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12">
              <el-form-item label="交割时间">
                <el-date-picker v-model="form.closingDate" type="date" value-format="YYYY-MM-DD" format="YYYY年M月D日" placeholder="选择交割时间" class="w-full" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="20">
            <el-col :xs="24" :sm="12">
              <el-form-item label="初始投后估值">
                <el-input v-model="form.initialPostValuation" placeholder="如：2.5亿元" />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12">
              <el-form-item label="最新估值">
                <el-input v-model="form.latestValuation" placeholder="如：3.2亿元" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="20">
            <el-col :xs="24" :sm="12">
              <el-form-item label="估值变化金额">
                <el-input :model-value="formatValuationChangeAmount(form)" disabled />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12">
              <el-form-item label="估值变化比例">
                <el-input :model-value="formatValuationChangeRatio(form)" disabled />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="20">
            <el-col :xs="24" :sm="12">
              <el-form-item label="估值更新时间">
                <el-date-picker v-model="form.valuationUpdateDate" type="month" value-format="YYYY-MM" format="YYYY年M月" placeholder="选择更新时间" class="w-full" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-divider content-position="left"><el-icon><DataAnalysis /></el-icon> 人才与企业数据</el-divider>
          <el-row :gutter="20">
            <el-col :xs="24" :sm="8">
              <el-form-item label="服务人才数量">
                <el-input v-model="form.servedTalentCount" />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="8">
              <el-form-item label="员工总数">
                <el-input v-model="form.employeeCount" />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="8">
              <el-form-item label="科研人员数量">
                <el-input v-model="form.researcherCount" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="20">
            <el-col :xs="24" :sm="8">
              <el-form-item label="高层次人才">
                <el-input v-model="form.highLevelTalentCount" />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="8">
              <el-form-item label="博士人数">
                <el-input v-model="form.doctorCount" />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="8">
              <el-form-item label="硕士人数">
                <el-input v-model="form.masterCount" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="20">
            <el-col :xs="24" :sm="12">
              <el-form-item label="是否在汉注册">
                <el-radio-group v-model="form.registeredInWuhan">
                  <el-radio label="是" value="是" />
                  <el-radio label="否" value="否" />
                </el-radio-group>
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12">
              <el-form-item label="是否在汉纳税">
                <el-radio-group v-model="form.taxedInWuhan">
                  <el-radio label="是" value="是" />
                  <el-radio label="否" value="否" />
                </el-radio-group>
              </el-form-item>
            </el-col>
          </el-row>

          <el-divider content-position="left"><el-icon><Comment /></el-icon> 投后跟踪</el-divider>
          <el-form-item label="最新经营进展">
            <el-input v-model="form.latestOperationProgress" type="textarea" :rows="3" />
          </el-form-item>
          <el-form-item label="投后服务事项">
            <el-input v-model="form.postInvestmentServices" type="textarea" :rows="2" />
          </el-form-item>
          <el-form-item label="风险情况">
            <el-input v-model="form.riskStatus" type="textarea" :rows="2" />
          </el-form-item>
          <el-form-item label="下一步计划">
            <el-input v-model="form.nextPlan" type="textarea" :rows="2" />
          </el-form-item>
          <el-form-item label="最近更新时间">
            <el-date-picker v-model="form.postLastUpdateDate" type="date" value-format="YYYY-MM-DD" format="YYYY年M月D日" placeholder="选择最近更新时间" class="w-full" />
          </el-form-item>

          <el-divider content-position="left"><el-icon><Collection /></el-icon> 退出信息</el-divider>
          <el-row :gutter="20">
            <el-col :xs="24" :sm="12">
              <el-form-item label="退出时间">
                <el-date-picker v-model="form.exitDate" type="date" value-format="YYYY-MM-DD" format="YYYY年M月D日" placeholder="选择退出时间" class="w-full" />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12">
              <el-form-item label="退出方式">
                <el-input v-model="form.exitMethod" placeholder="如：股权转让、回购、并购退出" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="20">
            <el-col :xs="24" :sm="12">
              <el-form-item label="退出金额">
                <el-input v-model="form.exitAmount" placeholder="如：2500万元" />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12">
              <el-form-item label="退出收益">
                <el-input v-model="form.exitIncome" placeholder="可手填；不填则按退出金额-投资金额计算" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="20">
            <el-col :xs="24" :sm="12">
              <el-form-item label="收益率">
                <el-input v-model="form.exitReturnRatio" placeholder="可手填，如：25%" />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12">
              <el-form-item label="系统测算">
                <el-input :model-value="`${formatExitIncome(form)} / ${formatExitReturnRatio(form)}`" disabled />
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item label="退出备注">
            <el-input v-model="form.exitRemark" type="textarea" :rows="2" />
          </el-form-item>

          <el-divider content-position="left"><el-icon><Comment /></el-icon> 备注信息</el-divider>
          <el-form-item label="备注">
            <el-input v-model="form.remark" type="textarea" :rows="2" />
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="saveProject">保存项目</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 放大查看弹窗 -->
    <el-dialog v-model="zoomDialogVisible" :title="enlargedChart?.title || '图表放大'" :width="isMobile ? '95%' : '90%'" top="5vh" destroy-on-close>
      <div id="chart-zoom" :style="{ width: '100%', height: isMobile ? '400px' : '600px' }"></div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="zoomDialogVisible = false">关闭</el-button>
        </span>
      </template>
    </el-dialog>
  </el-container>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick, watch, toRaw } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import * as echarts from 'echarts'
import { 
  Monitor, Fold, Expand, Download, Collection, DataAnalysis, 
  InfoFilled, Grid, Coin, Comment, Upload, Delete, 
  RefreshRight, Filter, Search, Plus, Refresh, Edit
} from '@element-plus/icons-vue'

// --- 词典与标准化工具 ---
const defaultFunds = ['XX一号基金', 'XX二号基金', 'XX三号基金（筹备中）', '待定']
const defaultSources = ['政府推荐', '园区推荐', '高校院所推荐', 'FA推荐', '机构推荐', '股东/LP推荐', '路演活动', '自主挖掘', '企业主动申报', '历史储备项目', '其他']
const defaultFundAliases = {
  '一号基金': 'XX一号基金',
  'XX一号基金': 'XX一号基金',
  '二号基金': 'XX二号基金',
  'XX二号基金': 'XX二号基金',
  '筹备中': 'XX三号基金（筹备中）',
  '未成立': 'XX三号基金（筹备中）',
  '未成立/筹备中': 'XX三号基金（筹备中）',
  'XX三号基金（筹备中）': 'XX三号基金（筹备中）'
}
const fundAliases = reactive({ ...defaultFundAliases })

const normalizeFundName = (val) => {
  if (!val) return "待定";
  const text = String(val).trim();
  if (fundAliases[text]) return fundAliases[text];
  return text;
};

const normalizeProjectSource = (val) => {
  const text = String(val || '').trim()
  return text || '未填写'
}

const normalizeProjectStage = (val) => {
  const text = String(val || '').trim()
  if (text === '终止/放弃') return '已退出'
  return text || '储备项目'
}

const parseFundNames = (val) => {
  if (!val) return ["待定"];
  let text = String(val).trim();
  
  // 拆分支持的各种分隔符
  const parts = text.split(/[、，,/;；+/\s]+/).filter(i => i)
  if (parts.length === 0) return ["待定"]
  return [...new Set(parts.map(p => normalizeFundName(p)))]
}

const normalizeCollectMonth = (val) => {
  if (!val) return "";
  let text = String(val).trim();
  
  // 处理 2025年10月
  const cnMatch = text.match(/(\d{4})年(\d{1,2})月/);
  if (cnMatch) return `${cnMatch[1]}-${cnMatch[2].padStart(2, '0')}`;

  // 处理 2025年
  const yearCnMatch = text.match(/(\d{4})年/);
  if (yearCnMatch && !text.includes('月')) return yearCnMatch[1];

  // 处理 2025/10 或 2025-10 或 2025-10-10
  if (text.includes('-') || text.includes('/')) {
    const parts = text.split(/[-/]/);
    if (parts.length >= 2) {
      const year = parts[0];
      const month = parts[1].padStart(2, '0');
      return `${year}-${month}`;
    }
  }
  
  // 只有年份数字
  if (/^\d{4}$/.test(text)) return text;
  
  return text;
}

const formatCollectMonthCN = (val) => {
  if (!val) return "";
  const norm = normalizeCollectMonth(val);
  if (!norm) return "";
  if (norm.includes('-')) {
    const [y, m] = norm.split('-');
    return `${y}年${parseInt(m)}月`;
  }
  if (/^\d{4}$/.test(norm)) return `${norm}年`;
  return norm;
}

const formatDateCN = (val) => {
  if (!val) return ''
  const text = String(val).trim()
  const fullDateMatch = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/)
  if (fullDateMatch) {
    return `${fullDateMatch[1]}年${parseInt(fullDateMatch[2])}月${parseInt(fullDateMatch[3])}日`
  }
  const cnDateMatch = text.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/)
  if (cnDateMatch) {
    return `${cnDateMatch[1]}年${parseInt(cnDateMatch[2])}月${parseInt(cnDateMatch[3])}日`
  }
  return formatCollectMonthCN(text) || text
}

const getMonthNum = (val) => {
  if (!val) return 0;
  const str = String(val);
  if (str.includes('-')) {
    const [y, m] = str.split('-').map(Number);
    return y * 12 + m;
  }
  if (/^\d{4}$/.test(str)) {
    return Number(str) * 12 + 1;
  }
  return 0;
};

const investedStageSet = new Set(['已投决待交割', '已交割'])

const investedExtraHeaders = [
  '投资金额', '持股比例', '投资时间', '交割时间', '初始投后估值', '最新估值', '估值变化金额', '估值变化比例', '估值更新时间',
  '服务人才数量', '企业员工总数', '科研人员数量', '高层次人才数量', '博士人数', '硕士人数', '办公地',
  '是否在汉注册', '是否在汉纳税', '最新经营进展', '投后服务事项', '风险情况', '下一步计划', '最近更新时间'
]

const investedExtraKeys = [
  'investmentAmount', 'shareholdingRatio', 'investmentDate', 'closingDate', 'initialPostValuation', 'latestValuation', 'valuationChangeAmount', 'valuationChangeRatio', 'valuationUpdateDate',
  'servedTalentCount', 'employeeCount', 'researcherCount', 'highLevelTalentCount', 'doctorCount', 'masterCount', 'officeLocation',
  'registeredInWuhan', 'taxedInWuhan', 'latestOperationProgress', 'postInvestmentServices', 'riskStatus', 'nextPlan', 'postLastUpdateDate'
]

const coreExportHeaders = ['项目名称', '企业名称', '所属基金', '当前阶段', '是否重点推进', '项目来源', '收集年月', '项目类型', '原始行业', '系统标准行业', '965大类', '965产业方向', '细分领域', '注册地', '融资轮次', '本轮融资金额', '项目负责人', '项目优先级', '当前进展', '备注']
const coreExportKeys = ['name', 'company', 'fund', 'stage', 'isKey', 'source', 'year', 'type', 'originalIndustry', 'standardIndustry', 'industry965Category', 'industry965Direction', 'subField', 'location', 'round', 'amount', 'manager', 'priority', 'progress', 'remark']
const exportHeaders = [...coreExportHeaders, ...investedExtraHeaders]
const exportKeys = [...coreExportKeys, ...investedExtraKeys]

const parseAmountToWan = (value) => {
  if (value === null || value === undefined || value === '') return null
  const text = String(value).replace(/,/g, '').trim()
  if (!text) return null
  const match = text.match(/-?\d+(\.\d+)?/)
  if (!match) return null
  let num = Number(match[0])
  if (Number.isNaN(num)) return null
  if (text.includes('亿')) num *= 10000
  return num
}

const parseCountValue = (value) => {
  if (value === null || value === undefined || value === '') return 0
  const match = String(value).replace(/,/g, '').match(/-?\d+(\.\d+)?/)
  return match ? Number(match[0]) : 0
}

const formatWanAmount = (value) => {
  const num = Number(value)
  if (!Number.isFinite(num)) return '-'
  if (Math.abs(num) >= 10000) {
    const yi = num / 10000
    return `${Number.isInteger(yi) ? yi : yi.toFixed(2)}亿元`
  }
  return `${Number.isInteger(num) ? num : num.toFixed(2)}万元`
}

const calcValuationChangeAmount = (project) => {
  const latest = parseAmountToWan(project.latestValuation)
  const initial = parseAmountToWan(project.initialPostValuation)
  if (latest === null || initial === null) return null
  return latest - initial
}

const calcValuationChangeRatio = (project) => {
  const initial = parseAmountToWan(project.initialPostValuation)
  const diff = calcValuationChangeAmount(project)
  if (initial === null || initial === 0 || diff === null) return null
  return diff / initial
}

const formatValuationChangeAmount = (project) => {
  const diff = calcValuationChangeAmount(project)
  return diff === null ? '-' : formatWanAmount(diff)
}

const formatValuationChangeRatio = (project) => {
  const ratio = calcValuationChangeRatio(project)
  if (ratio === null) return '-'
  return `${ratio > 0 ? '+' : ''}${(ratio * 100).toFixed(1)}%`
}

const getValuationChangeClass = (project) => {
  const diff = calcValuationChangeAmount(project)
  if (diff === null || diff === 0) return 'neutral'
  return diff > 0 ? 'up' : 'down'
}

const displayValue = (value) => {
  if (value === null || value === undefined || value === '') return '-'
  return value
}

const dicts = {
  funds: [...defaultFunds],
  stages: ['储备项目', '立项阶段', '尽调阶段', '投决阶段', '已投决待交割', '已交割', '暂缓跟进', '已退出'],
  isKeyOptions: ['是', '否', '待判断'],
  sources: [...defaultSources],
  priorities: ['高', '中', '低', '待评估'],
  industry965Categories: ['9大支柱产业', '6大战略性新兴产业', '5大未来产业', '待分类', '其他'],
  industry965Map: {
    '9大支柱产业': ['光芯屏端网', '汽车制造和服务', '大健康和生物技术', '高端装备制造', '智能建造', '商贸物流', '现代金融', '绿色环保', '文化旅游'],
    '6大战略性新兴产业': ['网络安全', '航空航天', '空天信息', '人工智能', '数字创意', '氢能'],
    '5大未来产业': ['电磁能', '量子科技', '超级计算', '脑科学和类脑科学', '深地深海深空'],
    '待分类': ['待分类'],
    '其他': ['其他']
  },
  standardIndustries: [
    '新一代信息技术', '人工智能', '集成电路', '光电子信息', '高端装备', '智能制造',
    '汽车与新能源车', '新能源', '新材料', '节能环保', '生物医药', '医疗器械', '大健康',
    '数字经济', '现代服务业', '文化创意', '消费', '农业科技', '其他', '待分类'
  ]
}

const displayDicts = computed(() => {
  return {
    funds: dicts.funds,
    stages: dicts.stages,
    isKey: dicts.isKeyOptions,
    sources: dicts.sources,
    priorities: dicts.priorities,
    categories: dicts.industry965Categories,
    industries: dicts.standardIndustries
  }
})

const dictLabels = {
  funds: '所属基金',
  stages: '项目阶段',
  isKey: '重点推进',
  sources: '项目来源',
  priorities: '优先级',
  categories: '965工作大类',
  industries: '系统标准行业'
}

// --- 模拟数据生成 ---
const mockData = [
  { id: 1, name: '硅基光子芯片研发项目', company: 'XX科技有限公司', fund: 'XX一号基金', stage: '立项阶段', isKey: '是', source: '自主挖掘', year: '2025-01', industry965Category: '9大支柱产业', industry965Direction: '光芯屏端网', manager: '张经理', priority: '高', progress: '已完成初步软硬件验证。' },
  {
    id: 2, name: 'AI无人驾驶系统', company: 'XX智能科技有限公司', fund: 'XX二号基金', stage: '已投决待交割', isKey: '是', source: '园区推荐', year: '2024-10', industry965Category: '6大战略性新兴产业', industry965Direction: '人工智能', subField: '自动驾驶算法', location: 'XX市', officeLocation: 'XX产业园', manager: '李主任', priority: '高', progress: '投决已通过，交割资料准备中。', remark: '需跟踪下一轮融资窗口。',
    investmentAmount: '2000万元', shareholdingRatio: '8%', investmentDate: '2025-02', closingDate: '', initialPostValuation: '2.5亿元', latestValuation: '3.2亿元', valuationUpdateDate: '2025-05', round: 'A轮',
    servedTalentCount: 18, employeeCount: 126, researcherCount: 64, highLevelTalentCount: 6, doctorCount: 8, masterCount: 35, registeredInWuhan: '是', taxedInWuhan: '是',
    latestOperationProgress: '已完成车路协同测试场景扩展，新增两家主机厂试点。', postInvestmentServices: '协助对接智能网联汽车场景和高层次人才政策。', riskStatus: '交割节奏受客户回款影响。', nextPlan: '推动交割材料闭环并跟进量产订单。', postLastUpdateDate: '2025-05-28'
  },
  {
    id: 3, name: '重组蛋白药研发', company: 'XX生物科技有限公司', fund: 'XX一号基金', stage: '已交割', isKey: '否', source: '高校院所推荐', year: '2023-05', industry965Category: '9大支柱产业', industry965Direction: '大健康和生物技术', subField: '创新药研发', location: 'XX市', officeLocation: 'XX高新区', manager: '王工', priority: '中', progress: '已于去年完成1500万注资。', remark: '持续关注临床前数据。',
    investmentAmount: '1500万元', shareholdingRatio: '6%', investmentDate: '2023-09', closingDate: '2023-10', initialPostValuation: '2.5亿元', latestValuation: '2.5亿元', valuationUpdateDate: '2025-04', round: 'Pre-A轮',
    servedTalentCount: 12, employeeCount: 82, researcherCount: 48, highLevelTalentCount: 5, doctorCount: 12, masterCount: 26, registeredInWuhan: '是', taxedInWuhan: '是',
    latestOperationProgress: '核心管线完成药效验证，正在推进CMC工艺放大。', postInvestmentServices: '协助申报人才项目和对接临床资源。', riskStatus: '研发周期较长，短期收入贡献有限。', nextPlan: '跟进下一批动物实验数据和专利布局。', postLastUpdateDate: '2025-05-20'
  },
  {
    id: 4, name: '氢能源电池PACK', company: 'XX能源科技有限公司', fund: 'XX三号基金（筹备中）', stage: '已投决待交割', isKey: '否', source: 'FA推荐', year: '2025-02', industry965Category: '6大战略性新兴产业', industry965Direction: '氢能', subField: '燃料电池系统', location: 'XX市', officeLocation: 'XX经开区', manager: '赵经理', priority: '中', progress: '投决通过，等待工商和协议附件完善。', remark: '估值待交割前复核。',
    investmentAmount: '1200万元', shareholdingRatio: '5%', investmentDate: '2025-04', closingDate: '', initialPostValuation: '', latestValuation: '', valuationUpdateDate: '', round: 'A轮',
    servedTalentCount: 6, employeeCount: 95, researcherCount: 31, highLevelTalentCount: 2, doctorCount: 3, masterCount: 18, registeredInWuhan: '否', taxedInWuhan: '否',
    latestOperationProgress: '样机进入整车厂联合测试，XX研发中心筹备中。', postInvestmentServices: '协调属地注册和产业园落地政策咨询。', riskStatus: '异地注册和客户验证进度存在不确定性。', nextPlan: '推动属地主体设立和交割条件确认。', postLastUpdateDate: '2025-05-18'
  },
  { id: 5, name: '量子加密路由器', company: 'XX信息安全有限公司', fund: 'XX二号基金', stage: '投决阶段', isKey: '是', source: '路演活动', year: '2025-03', industry965Category: '5大未来产业', industry965Direction: '量子科技', manager: '张经理', priority: '高', progress: '已过初评，待上投决会。' },
  { id: 6, name: '深海探测机器人', company: 'XX机器人有限公司', fund: 'XX一号基金、XX二号基金', stage: '储备项目', isKey: '待判断', source: '自主挖掘', year: '2024-12', industry965Category: '5大未来产业', industry965Direction: '深地深海深空', manager: '钱工', priority: '低', progress: '信息收集阶段。' },
  {
    id: 7, name: '工业4.0视觉检测', company: 'XX检测科技有限公司', fund: 'XX二号基金', stage: '已投决待交割', isKey: '是', source: '历史储备项目', year: '2023-11', industry965Category: '9大支柱产业', industry965Direction: '高端装备制造', subField: '机器视觉检测', location: 'XX市', officeLocation: 'XX产业园', manager: '孙组长', priority: '高', progress: '手续最后签署中。', remark: '产业协同空间较大。',
    investmentAmount: '1800万元', shareholdingRatio: '7.5%', investmentDate: '2025-01', closingDate: '', initialPostValuation: '2.4亿元', latestValuation: '2.1亿元', valuationUpdateDate: '2025-05', round: 'B轮',
    servedTalentCount: 21, employeeCount: 210, researcherCount: 76, highLevelTalentCount: 4, doctorCount: 5, masterCount: 42, registeredInWuhan: '是', taxedInWuhan: '是',
    latestOperationProgress: '新签两条产线视觉检测订单，但毛利率短期承压。', postInvestmentServices: '协助对接智能制造客户和研发补贴申报。', riskStatus: '应收账款周期拉长，需关注现金流。', nextPlan: '跟踪交割完成和重点客户回款。', postLastUpdateDate: '2025-05-26'
  },
  { id: 8, name: '新型碳纤维材料', company: 'XX新材料有限公司', fund: 'XX一号基金', stage: '暂缓跟进', isKey: '否', source: '园区推荐', year: '2022-09', industry965Category: '待分类', industry965Direction: '待分类', manager: '周经理', priority: '中', progress: '由于估值分歧暂缓。' },
  {
    id: 9, name: 'XX医疗器械项目', company: 'XX医疗科技有限公司', fund: 'XX一号基金', stage: '已交割', isKey: '是', source: '机构推荐', year: '2024-03', industry965Category: '9大支柱产业', industry965Direction: '大健康和生物技术', subField: '医疗器械', location: 'XX市', officeLocation: 'XX生物城', manager: '陈经理', priority: '高', progress: '已完成投资交割并进入投后服务期。', remark: '重点支持人才团队建设。',
    investmentAmount: '1000万元', shareholdingRatio: '4.8%', investmentDate: '2024-06', closingDate: '2024-07', initialPostValuation: '2.08亿元', latestValuation: '2.9亿元', valuationUpdateDate: '2025-05', round: 'A轮',
    servedTalentCount: 25, employeeCount: 138, researcherCount: 69, highLevelTalentCount: 8, doctorCount: 10, masterCount: 39, registeredInWuhan: '是', taxedInWuhan: '是',
    latestOperationProgress: '二类医疗器械产品进入注册检测阶段，新增三甲医院合作。', postInvestmentServices: '协助高层次人才认定、临床资源对接和融资材料梳理。', riskStatus: '注册审批周期可能拉长。', nextPlan: '持续跟踪注册检测节点和下一轮融资进展。', postLastUpdateDate: '2025-05-30'
  }
]

// --- 状态变量 ---
const isCollapsed = ref(false)
const isMobile = ref(false)
const isMobileMenuOpen = ref(false)
const activeMenu = ref('overview')
const projects = ref([])
const lastUpdateTime = ref(new Date().toLocaleString())
const currentPage = ref(1)
const pageSize = ref(20)

// 全局加载状态
const isLoading = ref(false)
const loadingText = ref('加载中...')

// 菜单选择处理
const handleMenuSelect = (index) => {
  activeMenu.value = index
  if (isMobile.value) {
    isMobileMenuOpen.value = false
  }
  if (index === 'overview') {
    nextTick(() => initCharts())
  } else if (index === 'invested') {
    nextTick(() => initInvestedCharts())
  }
}

// 搜索防抖
const filterKeyword = ref('')
const debouncedKeyword = ref('')
let debounceTimer = null
watch(filterKeyword, (val) => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    debouncedKeyword.value = val
    currentPage.value = 1
  }, 300)
})

const dashboardCharts = [
  { id: 'chart-fund', title: '各基金项目数量对比' },
  { id: 'chart-stage', title: '项目当前阶段分布' },
  { id: 'chart-965cat', title: '965核心大类占比' },
  { id: 'chart-965dir', title: '965产业方向 Top 排名' },
  { id: 'chart-year', title: '收集年月趋势' },
  { id: 'chart-source', title: '项目来源分布' }
]

const filters = reactive({
  keyword: '',
  fund: '',
  stage: '',
  isKey: '',
  collectMonthStart: '',
  collectMonthEnd: '',
  industry965Category: '',
  industry965Direction: '',
  manager: '',
  priority: '',
  onlyUnclassified: false,
  // 首页汇总文字的时间筛选
  summaryStart: '',
  summaryEnd: ''
})

const investedFilters = reactive({
  keyword: '',
  fund: '',
  stage: '',
  industry965Category: '',
  industry965Direction: '',
  location: '',
  registeredInWuhan: '',
  taxedInWuhan: ''
})
const selectedInvestedProjectId = ref(null)
const investedDetailDialogVisible = ref(false)
const exitedFilters = reactive({
  keyword: '',
  fund: ''
})

const enlargedChart = ref(null)
const zoomDialogVisible = ref(false)

const openZoomDialog = (chart) => {
  enlargedChart.value = chart
  zoomDialogVisible.value = true
  nextTick(() => initZoomChart())
}

const dialogVisible = ref(false)
const formRef = ref(null)
const defaultForm = {
  id: null,
  name: '',
  company: '',
  fund: '待定',
  fundSelections: ['待定'],
  stage: '储备项目',
  isKey: '否',
  source: '自主挖掘',
  year: new Date().getFullYear().toString(),
  type: '',
  originalIndustry: '',
  standardIndustry: '待分类',
  industry965Category: '待分类',
  industry965Direction: '待分类',
  subField: '',
  location: 'XX市',
  officeLocation: '',
  round: '',
  amount: '',
  manager: '',
  priority: '待评估',
  progress: '',
  investmentAmount: '',
  shareholdingRatio: '',
  investmentDate: '',
  closingDate: '',
  initialPostValuation: '',
  latestValuation: '',
  valuationChangeAmount: '',
  valuationChangeRatio: '',
  valuationUpdateDate: '',
  servedTalentCount: '',
  employeeCount: '',
  researcherCount: '',
  highLevelTalentCount: '',
  doctorCount: '',
  masterCount: '',
  registeredInWuhan: '',
  taxedInWuhan: '',
  latestOperationProgress: '',
  postInvestmentServices: '',
  riskStatus: '',
  nextPlan: '',
  postLastUpdateDate: '',
  exitDate: '',
  exitMethod: '',
  exitAmount: '',
  exitIncome: '',
  exitReturnRatio: '',
  exitRemark: '',
  remark: ''
}
let form = reactive({ ...defaultForm })

const formRules = {
  name: [{ required: true, message: '请输入项目名称', trigger: 'blur' }]
}

const fileInput = ref(null)

// --- 计算属性 ---
const menuTitle = computed(() => {
  const map = {
    overview: '管理驾驶舱 Dashboard',
    library: '项目库全景分析',
    invested: '已投项目资料',
    exited: '已退出项目',
    importExport: '业务数据中心',
    dictionary: '系统运行参数'
  }
  return map[activeMenu.value]
})

const filteredProjects = computed(() => {
  const kw = debouncedKeyword.value.trim().toLowerCase();
  const f_fund = filters.fund;
  const f_stage = filters.stage;
  const f_isKey = filters.isKey;
  const f_cat = filters.industry965Category;
  const f_dir = filters.industry965Direction;
  const f_dup = filters.isDuplicate;
  const f_onlyUn = filters.onlyUnclassified;
  const f_start = filters.collectMonthStart;
  const f_end = filters.collectMonthEnd;

  const fStartNum = f_start ? getMonthNum(f_start) : -Infinity;
  const fEndNum = f_end ? getMonthNum(f_end) : Infinity;

  return projects.value.filter(p => {
    // 快捷筛选：未分类
    if (f_onlyUn && !isUnclassified(p)) return false;

    // 关键词搜索
    if (kw && !p._searchKey.includes(kw)) return false;
    
    // 多基金筛选
    if (f_fund && !p._fundNames.includes(f_fund)) return false;
    
    // 其他字段
    if (f_stage && p.stage !== f_stage) return false;
    if (f_isKey && p.isKey !== f_isKey) return false;
    
    // 收集年月范围筛选
    if (f_start || f_end) {
      const norm = p._normalizedMonth;
      if (!norm) return false;
      const isYearOnly = /^\d{4}$/.test(norm);
      const pStartNum = getMonthNum(norm);
      const pEndNum = isYearOnly ? pStartNum + 11 : pStartNum;
      
      // 相交判断 [pStart, pEnd] 与 [fStart, fEnd] 是否有交集
      if (pStartNum > fEndNum || pEndNum < fStartNum) return false;
    }
    
    // 965大类
    if (f_cat && p.industry965Category !== f_cat) return false;
    if (f_dir && p.industry965Direction !== f_dir) return false;
    
    // 疑似重复
    if (f_dup === '是' || f_dup === true) {
      if (!p._isDuplicate) return false;
    } else if (f_dup === '否') {
      if (p._isDuplicate) return false;
    }

    return true;
  }).sort((a, b) => (b.id || 0) - (a.id || 0))
})

const libraryStats = computed(() => {
  const all = projects.value.length
  const filtered = filteredProjects.value.length
  const keys = projects.value.filter(p => p.isKey === '是').length
  const dups = projects.value.filter(p => p._isDuplicate).length
  const unclassified = projects.value.filter(p => isUnclassified(p)).length
  
  // 核心去重计数 (独立于筛选的全局全量去重库中项目)
  const uniqueCount = projects.value.filter(p => {
    // 这里简单定义：如果不标记为重复，或者是重复项集合中第一个
    // 其实有了 _isDuplicate 之后，去重总数可以直接利用 Map 计算，或者直接算不被标记为 _isDuplicate 的数量？
    // 不对，_isDuplicate 标记的是“凡是名字企业一样的都标记为重复”。
    return !p._isDuplicate;
  }).length;
  
  // 修正：正确的去重总数计算
  const dupMap = new Map();
  projects.value.forEach(p => {
    const key = `${(p.name || '').trim()}_${(p.company || '').trim()}`;
    if (p.name) dupMap.set(key, 1);
  });
  const deDupAllCount = dupMap.size;

  return [
    { label: '储备总数', value: all, class: 'text-slate-800' },
    { label: '去重项目', value: deDupAllCount, class: 'text-indigo-600' },
    { label: '重点推进', value: keys, class: 'text-red-500' },
    { label: '疑似重复', value: dups, class: 'text-rose-600' },
    { label: '未分类项目', value: unclassified, class: 'text-amber-600' }
  ]
})

const isUnclassified = (p) => {
  const cat = p.industry965Category
  const dir = p.industry965Direction
  const noCat = !cat || ['待分类', '未分类', '其他'].includes(cat)
  const noDir = !dir || ['待分类', '未分类', '其他'].includes(dir)
  return noCat || noDir
}

const filterUnclassified = () => {
  resetFilters()
  filters.onlyUnclassified = true
  currentPage.value = 1
}

const completeness = computed(() => {
  return {}
})

const fundSummaryParts = (items) => {
  return dicts.funds
    .map(fund => ({
      fund,
      count: items.filter(p => p._fundNames.includes(fund)).length
    }))
    .filter(item => item.count > 0 && item.fund !== '待定')
    .map(item => `${item.fund}储备项目 ${item.count} 条`)
}

const summaryText = computed(() => {
  if (projects.value.length === 0) return "系统内尚无数据。请导入项目数据以生成摘要。"
  
  const total = projects.value.length
  const fundSummary = fundSummaryParts(projects.value)
  const fundSummaryText = fundSummary.length ? `其中，${fundSummary.join('，')}。` : ''
  
  // 使用 Map 一次性计算去重
  const getDeDupCount = (items) => {
     const seen = new Set();
     items.forEach(p => {
       const key = `${(p.name || '').trim()}_${(p.company || '').trim()}`;
       if (p.name) seen.add(key);
     });
     return seen.size;
  };
  const deDupAllCount = getDeDupCount(projects.value);

  let baseText = `截至当前，系统共收录储备项目 ${total} 条，去重后项目 ${deDupAllCount} 个。${fundSummaryText}注：同一项目可同时纳入多个基金储备池，因此各基金数量合计可能大于去重后项目数量。`

  if (filters.summaryStart || filters.summaryEnd) {
    const fStart = filters.summaryStart;
    const fEnd = filters.summaryEnd;
    const fStartNum = fStart ? getMonthNum(fStart) : -Infinity;
    const fEndNum = fEnd ? getMonthNum(fEnd) : Infinity;

    const periodProjects = projects.value.filter(p => {
      const m = p._normalizedMonth
      if (!m) return false
      
      const isYearOnly = /^\d{4}$/.test(m);
      const pStartNum = getMonthNum(m);
      const pEndNum = isYearOnly ? pStartNum + 11 : pStartNum;

      // 相交判断
      if (pStartNum > fEndNum || pEndNum < fStartNum) return false;
      return true
    })
    
    const deDupPeriodCount = getDeDupCount(periodProjects)
    
    const dirCounts = {}
    periodProjects.forEach(p => {
      const d = p.industry965Direction || '未分类'
      if (d && !['待分类', '其他', '未分类'].includes(d)) {
        dirCounts[d] = (dirCounts[d] || 0) + 1
      }
    })
    const top3 = Object.entries(dirCounts).sort((a,b) => b[1] - a[1]).slice(0, 3).map(i => i[0])
    const concentText = top3.length ? top3.join('、') : '暂未形成明显集中方向'
    const periodDeep = periodProjects.filter(p => ['尽调阶段', '投决阶段', '已投决待交割', '已交割'].includes(p.stage)).length

    const startStr = formatCollectMonthCN(filters.summaryStart) || '开始'
    const endStr = formatCollectMonthCN(filters.summaryEnd) || '当前'
    
    baseText += ` 在 ${startStr} 至 ${endStr} 期间，系统新增储备项目 ${periodProjects.length} 条，去重后新增项目 ${deDupPeriodCount} 个，主要集中在 ${concentText} 等产业方向，进入尽调及以后阶段的项目共 ${periodDeep} 个。`
  } else {
    const dirCounts = {}
    projects.value.forEach(p => {
      const d = p.industry965Direction || '未分类'
      if (d && !['待分类', '其他', '未分类'].includes(d)) dirCounts[d] = (dirCounts[d] || 0) + 1
    })
    const top3 = Object.entries(dirCounts).sort((a,b) => b[1] - a[1]).slice(0, 3).map(i => i[0])
    const deepWork = projects.value.filter(p => ['尽调阶段', '投决阶段', '已投决待交割', '已交割'].includes(p.stage)).length
    baseText = `当前系统共收录储备项目 ${total} 条，去重后项目 ${deDupAllCount} 个。${fundSummaryText}项目主要集中在 ${top3.length ? top3.join('、') : '多个'} 等产业方向，当前进入尽调及以后阶段的项目共 ${deepWork} 个。注：同一项目可同时纳入多个基金储备池，因此各基金数量合计可能大于去重后项目数量。`
  }

  return baseText
})

const availableDirectionsForFilter = computed(() => {
  if (filters.industry965Category && dicts.industry965Map[filters.industry965Category]) {
    return dicts.industry965Map[filters.industry965Category]
  }
  // 如果没选大类，显示所有在大类映射中存在的方向（避免全量遍历）
  return Object.values(dicts.industry965Map).flat()
})

// 过滤器中的收集年月选项，也使用 memo
const handle965FilterChange = () => {
  filters.industry965Direction = ''
  handleFilter()
}

const pagedProjects = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredProjects.value.slice(start, start + pageSize.value)
})

const investedProjects = computed(() => {
  const kw = investedFilters.keyword.trim().toLowerCase()
  return projects.value
    .filter(project => investedStageSet.has(project.stage))
    .filter(project => {
      if (investedFilters.fund && !project._fundNames?.includes(investedFilters.fund)) return false
      if (investedFilters.stage && project.stage !== investedFilters.stage) return false
      if (investedFilters.industry965Category && project.industry965Category !== investedFilters.industry965Category) return false
      if (investedFilters.industry965Direction && project.industry965Direction !== investedFilters.industry965Direction) return false
      if (investedFilters.location && project.location !== investedFilters.location) return false
      if (investedFilters.registeredInWuhan && project.registeredInWuhan !== investedFilters.registeredInWuhan) return false
      if (investedFilters.taxedInWuhan && project.taxedInWuhan !== investedFilters.taxedInWuhan) return false
      if (!kw) return true
      return `${project.name || ''} ${project.company || ''} ${project.manager || ''} ${project.latestOperationProgress || ''} ${project.progress || ''} ${project.remark || ''}`.toLowerCase().includes(kw)
    })
    .sort((a, b) => {
      const stageWeight = { '已交割': 2, '已投决待交割': 1 }
      const weightDiff = (stageWeight[b.stage] || 0) - (stageWeight[a.stage] || 0)
      if (weightDiff) return weightDiff
      return (b.id || 0) - (a.id || 0)
    })
})

const selectedInvestedProject = computed(() => {
  if (!investedProjects.value.length) return null
  return investedProjects.value.find(item => item.id === selectedInvestedProjectId.value) || investedProjects.value[0]
})

const investedStats = computed(() => {
  const list = projects.value.filter(project => investedStageSet.has(project.stage))
  const delivered = list.filter(project => project.stage === '已交割').length
  const pendingClose = list.filter(project => project.stage === '已投决待交割').length
  const investmentTotal = list.reduce((sum, project) => sum + (parseAmountToWan(project.investmentAmount || project.amount) || 0), 0)
  const latestValuationTotal = list.reduce((sum, project) => sum + (parseAmountToWan(project.latestValuation) || 0), 0)
  const valuationGrowthCount = list.filter(project => (calcValuationChangeAmount(project) || 0) > 0).length
  const servedTalentTotal = list.reduce((sum, project) => sum + parseCountValue(project.servedTalentCount), 0)
  const researcherTotal = list.reduce((sum, project) => sum + parseCountValue(project.researcherCount), 0)
  return [
    { label: '已投项目', value: list.length, color: '#1e3a8a' },
    { label: '已交割', value: delivered, color: '#16a34a' },
    { label: '待交割', value: pendingClose, color: '#ea580c' },
    { label: '累计投资金额', value: formatWanAmount(investmentTotal), color: '#0f766e' },
    { label: '最新估值合计', value: formatWanAmount(latestValuationTotal), color: '#2563eb' },
    { label: '估值增长项目', value: valuationGrowthCount, color: '#16a34a' },
    { label: '服务人才总数', value: servedTalentTotal, color: '#7c3aed' },
    { label: '科研人员总数', value: researcherTotal, color: '#0891b2' }
  ]
})

const investedCharts = [
  { id: 'chart-invested-fund', title: '各基金已投项目数量对比' },
  { id: 'chart-invested-industry', title: '已投项目产业分布' },
  { id: 'chart-invested-valuation', title: '估值变化Top项目' },
  { id: 'chart-invested-talent', title: '服务人才数量Top项目' }
]

const investedLocationOptions = computed(() => {
  return [...new Set(projects.value
    .filter(project => investedStageSet.has(project.stage))
    .map(project => project.location)
    .filter(Boolean))]
})

const availableInvestedDirections = computed(() => {
  if (investedFilters.industry965Category && dicts.industry965Map[investedFilters.industry965Category]) {
    return dicts.industry965Map[investedFilters.industry965Category]
  }
  return Object.values(dicts.industry965Map).flat()
})

const investedChartDataFund = computed(() => {
  return dicts.funds
    .filter(fund => fund !== '待定')
    .map(fund => ({
      name: fund,
      value: investedProjects.value.filter(project => project._fundNames?.includes(fund)).length
    }))
    .filter(item => item.value > 0)
})

const investedChartDataIndustry = computed(() => {
  const counts = {}
  investedProjects.value.forEach(project => {
    const key = project.industry965Direction || '未分类'
    counts[key] = (counts[key] || 0) + 1
  })
  return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
})

const investedChartDataValuationTop = computed(() => {
  return investedProjects.value
    .map(project => ({ name: project.name || '未命名项目', value: calcValuationChangeAmount(project) }))
    .filter(item => item.value !== null)
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    .slice(0, 8)
    .reverse()
})

const investedChartDataTalentTop = computed(() => {
  return investedProjects.value
    .map(project => ({ name: project.name || '未命名项目', value: parseCountValue(project.servedTalentCount) }))
    .filter(item => item.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 8)
    .reverse()
})

const exitedProjects = computed(() => {
  const kw = exitedFilters.keyword.trim().toLowerCase()
  return projects.value
    .filter(project => project.stage === '已退出')
    .filter(project => {
      if (exitedFilters.fund && !project._fundNames?.includes(exitedFilters.fund)) return false
      if (!kw) return true
      return `${project.name || ''} ${project.company || ''} ${project.exitMethod || ''} ${project.exitRemark || ''} ${project.remark || ''}`.toLowerCase().includes(kw)
    })
    .sort((a, b) => (getMonthNum(b.exitDate) || b.id || 0) - (getMonthNum(a.exitDate) || a.id || 0))
})

const calcExitIncomeWan = (project) => {
  const explicit = parseAmountToWan(project.exitIncome)
  if (explicit !== null) return explicit
  const exitAmount = parseAmountToWan(project.exitAmount)
  const investAmount = parseAmountToWan(project.investmentAmount || project.amount)
  if (exitAmount === null || investAmount === null) return null
  return exitAmount - investAmount
}

const calcExitReturnRatio = (project) => {
  const explicitText = String(project.exitReturnRatio || '').trim()
  if (explicitText) {
    const num = parseFloat(explicitText.replace('%', ''))
    if (!Number.isNaN(num)) return explicitText.includes('%') ? num / 100 : num
  }
  const investAmount = parseAmountToWan(project.investmentAmount || project.amount)
  const income = calcExitIncomeWan(project)
  if (investAmount === null || investAmount === 0 || income === null) return null
  return income / investAmount
}

const formatExitIncome = (project) => {
  const income = calcExitIncomeWan(project)
  return income === null ? '-' : formatWanAmount(income)
}

const formatExitReturnRatio = (project) => {
  const ratio = calcExitReturnRatio(project)
  if (ratio === null) return '-'
  return `${ratio > 0 ? '+' : ''}${(ratio * 100).toFixed(1)}%`
}

const getExitIncomeClass = (project) => {
  const income = calcExitIncomeWan(project)
  if (income === null || income === 0) return 'neutral'
  return income > 0 ? 'up' : 'down'
}

const exitedStats = computed(() => {
  const list = exitedProjects.value
  const totalExitAmount = list.reduce((sum, project) => sum + (parseAmountToWan(project.exitAmount) || 0), 0)
  const totalIncome = list.reduce((sum, project) => sum + (calcExitIncomeWan(project) || 0), 0)
  const positiveCount = list.filter(project => (calcExitIncomeWan(project) || 0) > 0).length
  return [
    { label: '退出项目数', value: list.length, color: '#1e3a8a' },
    { label: '退出金额合计', value: formatWanAmount(totalExitAmount), color: '#0f766e' },
    { label: '退出收益合计', value: formatWanAmount(totalIncome), color: totalIncome >= 0 ? '#16a34a' : '#dc2626' },
    { label: '正收益项目', value: positiveCount, color: '#16a34a' }
  ]
})

const statCards = computed(() => {
  const total = projects.value.length
  const fundColors = ['#2563eb', '#7c3aed', '#0891b2', '#0f766e', '#9333ea', '#be123c', '#0369a1']
  const fundCards = dicts.funds
    .filter(fund => fund !== '待定')
    .map((fund, index) => ({
      label: fund,
      value: projects.value.filter(p => p._fundNames.includes(fund)).length,
      color: fundColors[index % fundColors.length]
    }))
  
  const keyCount = projects.value.filter(p => p.isKey === '是' || p.isKey === true).length
  const inProgressCount = projects.value.filter(p => ['立项阶段', '尽调阶段', '投决阶段', '已投决待交割'].includes(p.stage)).length
  const deliveredCount = projects.value.filter(p => p.stage === '已交割').length
  const dupCount = projects.value.filter(p => p._isDuplicate).length

  return [
    { label: '项目记录数', value: total, color: '#1e3a8a' },
    ...fundCards,
    { label: '重点推进', value: keyCount, color: '#dc2626' },
    { label: '在推进项目', value: inProgressCount, color: '#ea580c' },
    { label: '已交割', value: deliveredCount, color: '#16a34a' },
    { label: '疑似重复数', value: dupCount, color: '#f43f5e' }
  ]
})

const availableDirections = computed(() => {
  return dicts.industry965Map[form.industry965Category] || []
})

const selectedFundTags = computed(() => normalizeFundSelections(form.fundSelections))

// --- 方法 ---

const normalizeFundSelections = (list) => {
  const normalized = (Array.isArray(list) ? list : [list])
    .map(item => normalizeFundName(item))
    .filter(Boolean)
  return [...new Set(normalized)]
}

const syncFormFund = () => {
  const funds = normalizeFundSelections(form.fundSelections)
  form.fundSelections = funds.length ? funds : ['待定']
  form.fund = form.fundSelections.join('、')
  form.fundSelections.forEach(item => {
    if (!dicts.funds.includes(item)) {
      dicts.funds.push(item)
      saveDictionarySettings()
    }
  })
}

const addFundSelect = () => {
  form.fundSelections.push('')
}

const removeFundSelect = (index) => {
  if (form.fundSelections.length === 1) return
  form.fundSelections.splice(index, 1)
  syncFormFund()
}

const removeFundTag = (fund) => {
  const target = normalizeFundName(fund)
  form.fundSelections = form.fundSelections.filter(item => normalizeFundName(item) !== target)
  syncFormFund()
}

const handleFundSelectionChange = (index) => {
  form.fundSelections[index] = normalizeFundName(form.fundSelections[index])
  syncFormFund()
}

const saveDictionarySettings = () => {
  try {
    localStorage.setItem('fund_dictionary_settings', JSON.stringify({
      funds: dicts.funds,
      aliases: toRaw(fundAliases)
    }))
  } catch (err) {
    console.error('Save dictionary failed:', err)
  }
}

const loadDictionarySettings = () => {
  try {
    const saved = localStorage.getItem('fund_dictionary_settings')
    if (!saved) return
    const parsed = JSON.parse(saved)
    if (Array.isArray(parsed.funds)) {
      const funds = parsed.funds.map(item => String(item).trim()).filter(Boolean)
      dicts.funds.splice(0, dicts.funds.length, ...new Set([...funds, '待定']))
    }
    if (parsed.aliases && typeof parsed.aliases === 'object') {
      Object.assign(fundAliases, parsed.aliases)
    }
  } catch (err) {
    console.error('Load dictionary failed:', err)
  }
}

const ensureFundOption = (fund) => {
  const normalized = normalizeFundName(fund)
  if (!normalized) return ''
  if (!dicts.funds.includes(normalized)) {
    dicts.funds.push(normalized)
    saveDictionarySettings()
  }
  return normalized
}

const ensureSourceOption = (source) => {
  const normalized = normalizeProjectSource(source)
  if (!dicts.sources.includes(normalized)) dicts.sources.push(normalized)
  return normalized
}

const addFundOption = () => {
  ElMessageBox.prompt('请输入新的基金名称', '添加所属基金', {
    confirmButtonText: '添加',
    cancelButtonText: '取消',
    inputPlaceholder: '例如：天使投资基金',
    inputValidator: (value) => {
      const name = String(value || '').trim()
      if (!name) return '基金名称不能为空'
      if (dicts.funds.includes(name)) return '该基金已存在'
      return true
    }
  }).then(({ value }) => {
    const name = String(value).trim()
    dicts.funds.push(name)
    fundAliases[name] = name
    saveDictionarySettings()
    ElMessage.success('基金已添加')
  }).catch(() => {})
}

const renameFundOption = (oldName) => {
  if (oldName === '待定') {
    ElMessage.warning('“待定”是系统默认兜底项，不建议重命名')
    return
  }
  ElMessageBox.prompt('请输入新的基金名称，保存后会同步更新已有项目记录', '更改基金名称', {
    confirmButtonText: '保存',
    cancelButtonText: '取消',
    inputValue: oldName,
    inputValidator: (value) => {
      const name = String(value || '').trim()
      if (!name) return '基金名称不能为空'
      if (name !== oldName && dicts.funds.includes(name)) return '该基金已存在'
      return true
    }
  }).then(({ value }) => {
    const newName = String(value).trim()
    if (newName === oldName) return

    const index = dicts.funds.indexOf(oldName)
    if (index >= 0) dicts.funds[index] = newName
    Object.entries(fundAliases).forEach(([alias, target]) => {
      if (target === oldName) fundAliases[alias] = newName
    })
    fundAliases[oldName] = newName
    fundAliases[newName] = newName

    projects.value = processProjects(toRaw(projects.value).map(project => ({
      ...project,
      fund: parseFundNames(project.fund)
        .map(item => item === oldName ? newName : item)
        .join('、')
    })))

    if (filters.fund === oldName) filters.fund = newName
    if (form.fundSelections?.some(item => normalizeFundName(item) === newName || item === oldName)) {
      form.fundSelections = form.fundSelections.map(item => item === oldName ? newName : item)
      syncFormFund()
    }

    saveDictionarySettings()
    saveToLocal()
    ElMessage.success('基金名称已更新')
  }).catch(() => {})
}

const deleteFundOption = (fundName) => {
  if (fundName === '待定') {
    ElMessage.warning('“待定”是系统默认兜底项，不能删除')
    return
  }

  const usedCount = projects.value.filter(project => project._fundNames?.includes(fundName)).length
  const message = usedCount
    ? `当前有 ${usedCount} 个项目使用“${fundName}”。删除后会同步从这些项目的所属基金中移除；如果项目没有其他所属基金，将自动改为“待定”。确定删除吗？`
    : `确定删除“${fundName}”吗？`

  ElMessageBox.confirm(message, '删除所属基金', {
    confirmButtonText: '删除',
    cancelButtonText: '取消',
    type: usedCount ? 'warning' : 'info',
    confirmButtonClass: 'el-button--danger'
  }).then(() => {
    const index = dicts.funds.indexOf(fundName)
    if (index >= 0) dicts.funds.splice(index, 1)

    Object.entries(fundAliases).forEach(([alias, target]) => {
      if (alias === fundName || target === fundName) delete fundAliases[alias]
    })

    projects.value = processProjects(toRaw(projects.value).map(project => {
      const remainingFunds = parseFundNames(project.fund).filter(item => item !== fundName)
      return {
        ...project,
        fund: (remainingFunds.length ? remainingFunds : ['待定']).join('、')
      }
    }))

    if (filters.fund === fundName) filters.fund = ''
    if (form.fundSelections?.some(item => normalizeFundName(item) === fundName || item === fundName)) {
      form.fundSelections = form.fundSelections.filter(item => normalizeFundName(item) !== fundName && item !== fundName)
      syncFormFund()
    }

    saveDictionarySettings()
    saveToLocal()
    ElMessage.success('基金已删除')
  }).catch(() => {})
}

const normalizeProject = (p, duplicateMap) => {
  const normFunds = parseFundNames(p.fund);
  normFunds.forEach(item => {
    ensureFundOption(item)
  })
  const source = ensureSourceOption(p.source)
  // 兼容多种可能的日期字段名
  const rawDate = p.year || p.collectMonth || p['收集年月'] || p['收集年份'] || p['年份'] || p['日期'] || p['收集日期'];
  const normMonth = normalizeCollectMonth(rawDate);
  const name = (p.name || '').trim();
  const company = (p.company || '').trim();
  const dupKey = `${name}_${company}`;
  
  // 预生成搜索字符串，由于是内部字段，前缀下划线
  const searchKey = `${p.name || ''} ${p.company || ''} ${p.progress || ''} ${p.manager || ''} ${p.source || ''}`.toLowerCase();
  
  return {
    ...p,
    stage: normalizeProjectStage(p.stage),
    source,
    _fundNames: normFunds,
    _normalizedMonth: normMonth,
    _searchKey: searchKey,
    _isDuplicate: name ? (duplicateMap.get(dupKey) > 1) : false
  };
};

const processProjects = (data) => {
  // 1. 建立重复统计字典
  const dupMap = new Map();
  data.forEach(p => {
    const name = (p.name || '').trim();
    const company = (p.company || '').trim();
    if (name) {
      const key = `${name}_${company}`;
      dupMap.set(key, (dupMap.get(key) || 0) + 1);
    }
  });

  // 2. 标准化处理
  return data.map(p => normalizeProject(p, dupMap));
};

const processProjectsInBatches = async (data, batchSize = 800) => {
  const dupMap = new Map()
  const normalized = []

  for (let i = 0; i < data.length; i++) {
    const p = data[i]
    const name = (p.name || '').trim()
    const company = (p.company || '').trim()
    if (name) {
      const key = `${name}_${company}`
      dupMap.set(key, (dupMap.get(key) || 0) + 1)
    }
    if (i > 0 && i % batchSize === 0) {
      loadingText.value = `正在整理重复项目... ${i} / ${data.length}`
      await waitForUi()
    }
  }

  for (let i = 0; i < data.length; i++) {
    normalized.push(normalizeProject(data[i], dupMap))
    if (i > 0 && i % batchSize === 0) {
      loadingText.value = `正在写入项目库... ${i} / ${data.length}`
      await waitForUi()
    }
  }

  return normalized
}

const loadData = async () => {
  isLoading.value = true;
  loadingText.value = '正在加载项目数据...';
  try {
    const saved = localStorage.getItem('fund_projects')
    let rawData = [];
    if (saved) {
      const parsed = JSON.parse(saved)
      rawData = Array.isArray(parsed) ? parsed : []
    } else {
      rawData = [...mockData]
    }
    
    // 延迟一帧让 loading 显示
    await new Promise(r => setTimeout(r, 50));
    projects.value = processProjects(rawData);
    if (!saved) saveToLocal();
  } catch (err) {
    console.error('Load data failed:', err)
    projects.value = processProjects([...mockData])
  } finally {
    isLoading.value = false;
  }
}

const saveToLocal = () => {
  try {
    // 使用 toRaw 确保保存的是原始数据而非 Proxy，避免循环引用问题
    const rawData = toRaw(projects.value).map(p => toRaw(p))
    localStorage.setItem('fund_projects', JSON.stringify(rawData))
    lastUpdateTime.value = new Date().toLocaleString()
  } catch (err) {
    console.error('Save to local failed:', err)
    // 如果仍然失败，尝试更激进的序列化
    try {
      const simpleData = projects.value.map(p => {
        const obj = {}
        Object.keys(p).forEach(k => {
          if (typeof p[k] !== 'function' && typeof p[k] !== 'symbol') {
            obj[k] = p[k]
          }
        })
        return obj
      })
      localStorage.setItem('fund_projects', JSON.stringify(simpleData))
    } catch (e) {
      ElMessage.error('持久化存储失败：检测到循环引用或无效数据')
    }
  }
}

const handleFilter = () => {
  currentPage.value = 1
}

const resetFilters = () => {
  Object.keys(filters).forEach(k => {
    if (typeof filters[k] === 'boolean') {
      filters[k] = false
    } else {
      filters[k] = ''
    }
  })
}

const resetInvestedFilters = () => {
  investedFilters.keyword = ''
  investedFilters.fund = ''
  investedFilters.stage = ''
  investedFilters.industry965Category = ''
  investedFilters.industry965Direction = ''
  investedFilters.location = ''
  investedFilters.registeredInWuhan = ''
  investedFilters.taxedInWuhan = ''
}

const handleInvestedCategoryChange = () => {
  investedFilters.industry965Direction = ''
}

const resetExitedFilters = () => {
  exitedFilters.keyword = ''
  exitedFilters.fund = ''
}

const selectInvestedProject = (project) => {
  selectedInvestedProjectId.value = project.id
  investedDetailDialogVisible.value = true
}

const getStageTagType = (stage) => {
  const map = {
    '储备项目': 'info',
    '立项阶段': 'warning',
    '尽调阶段': '',
    '投决阶段': 'success',
    '已投决待交割': 'success',
    '已交割': 'success',
    '暂缓跟进': 'info',
    '已退出': 'danger',
    '终止/放弃': 'danger'
  }
  return map[stage] || 'info'
}

const getPriorityTagType = (p) => {
  const map = { '高': 'danger', '中': 'warning', '低': 'info', '待评估': 'info' }
  return map[p] || ''
}

const openProjectDialog = (row = null) => {
  if (row) {
    Object.assign(form, defaultForm, row)
    form.fundSelections = parseFundNames(row.fund)
  } else {
    Object.assign(form, defaultForm)
    form.id = null
    form.fundSelections = [...defaultForm.fundSelections]
  }
  syncFormFund()
  dialogVisible.value = true
}

const handle965CategoryChange = (val) => {
  const directions = dicts.industry965Map[val] || []
  form.industry965Direction = directions.includes(form.industry965Direction) ? form.industry965Direction : directions[0]
}

const saveProject = () => {
  formRef.value.validate((valid) => {
    if (valid) {
      syncFormFund()
      // 基础校验
      if (!form.name) return ElMessage.error('项目名称不能为空')
      if (!form.fund) return ElMessage.error('所属基金不能为空')
      if (!form.stage) return ElMessage.error('当前阶段不能为空')

      // 965联动校验
      const directions = dicts.industry965Map[form.industry965Category]
      if (form.industry965Category === '待分类' && form.industry965Direction !== '待分类') {
        return ElMessage.error('“待分类”大类下的产业方向必须为“待分类”')
      }
      if (form.industry965Category === '其他' && form.industry965Direction !== '其他') {
        return ElMessage.error('“其他”大类下的产业方向必须为“其他”')
      }
      if (directions && !directions.includes(form.industry965Direction)) {
        return ElMessage.error(`“${form.industry965Category}”分类下的产业方向不匹配，请重新选择`)
      }

      // 收集年月校验
      if (form.year) {
        const y = parseInt(form.year.substring(0, 4))
        const currentYear = new Date().getFullYear()
        if (isNaN(y) || y < 2000 || y > currentYear + 1) {
          return ElMessage.error(`收集年月年份必须在 2000 到 ${currentYear + 1} 之间`)
        }
      }

      if (form.id) {
        const index = projects.value.findIndex(p => p.id === form.id)
        const { fundSelections, ...projectPayload } = toRaw(form)
        projects.value[index] = { ...projectPayload }
        // 修改后需要全量刷新标记（因为可能影响重复判定）
        projects.value = processProjects(toRaw(projects.value))
        ElMessage.success('更新成功')
      } else {
        const newId = projects.value.length ? Math.max(...projects.value.map(p => p.id || 0)) + 1 : 1
        const { fundSelections, ...projectPayload } = toRaw(form)
        const newItem = { ...projectPayload, id: newId }
        const newRaw = [...toRaw(projects.value), newItem]
        projects.value = processProjects(newRaw)
        ElMessage.success('新增成功')
      }
      saveToLocal()
      dialogVisible.value = false
    }
  })
}

const handleDelete = (row) => {
  ElMessageBox.confirm(`确定删除项目 "${row.name}" 吗？`, '警告', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    projects.value = processProjects(projects.value.filter(p => p.id !== row.id))
    saveToLocal()
    ElMessage.success('已删除')
  })
}

// --- 图表数据计算 ---
const chartDataFund = computed(() => {
  const fundCounts = {}
  dicts.funds.forEach(f => fundCounts[f] = 0)
  projects.value.forEach(p => {
    p._fundNames.forEach(ifund => {
      if (fundCounts[ifund] !== undefined) fundCounts[ifund]++
    })
  })
  return dicts.funds.map(f => ({ name: f, value: fundCounts[f] }))
})

const chartDataStage = computed(() => {
  return dicts.stages.map(s => ({
    name: s,
    value: projects.value.filter(p => p.stage === s).length
  })).filter(d => d.value > 0)
})

const chartData965Cat = computed(() => {
  return dicts.industry965Categories.map(c => ({
    name: c,
    value: projects.value.filter(p => p.industry965Category === c).length
  }))
})

const chartData965Dir = computed(() => {
  const dirCounts = {}
  projects.value.forEach(p => {
    if (p.industry965Direction) {
      dirCounts[p.industry965Direction] = (dirCounts[p.industry965Direction] || 0) + 1
    }
  })
  return Object.entries(dirCounts)
    .sort((a,b) => b[1] - a[1])
    .slice(0, 10)
    .reverse()
})

const chartDataYear = computed(() => {
  const monthCounts = {}
  projects.value.forEach(p => {
    const m = p._normalizedMonth
    if (m) monthCounts[m] = (monthCounts[m] || 0) + 1
  })
  const periods = Object.keys(monthCounts).sort()
  return {
    periods: periods.map(p => formatCollectMonthCN(p)),
    values: periods.map(y => monthCounts[y])
  }
})

const chartDataSource = computed(() => {
  const sourceCounts = {}
  projects.value.forEach(project => {
    const source = normalizeProjectSource(project.source)
    sourceCounts[source] = (sourceCounts[source] || 0) + 1
  })
  return Object.entries(sourceCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
})

const chartDataSourceSummary = computed(() => {
  const topLimit = 8
  const data = chartDataSource.value
  if (data.length <= topLimit) return data

  const topItems = data.slice(0, topLimit)
  const otherValue = data.slice(topLimit).reduce((sum, item) => sum + item.value, 0)
  return otherValue > 0
    ? [...topItems, { name: '其他来源', value: otherValue }]
    : topItems
})

// 图表初始化
let charts = []
const initCharts = () => {
  charts.forEach(c => c.dispose())
  charts = []

  const colors = ['#1e3a8a', '#3b82f6', '#8b5cf6', '#06b6d4', '#f59e0b', '#ef4444', '#10b981']
  const labelFontSize = 13
  const tooltipFontSize = 13
  const barLabelStyle = { show: true, position: 'top', fontSize: 12, fontWeight: 'bold' }

  // 1. 各基金数量
  renderChart('chart-fund', {
    tooltip: { textStyle: { fontSize: tooltipFontSize } },
    grid: { left: '3%', right: '4%', bottom: '5%', containLabel: true },
    xAxis: { 
      type: 'category', 
      data: chartDataFund.value.map(d => d.name), 
      axisLabel: { interval: 0, rotate: 15, fontSize: labelFontSize - 1 } 
    },
    yAxis: { type: 'value', axisLabel: { fontSize: labelFontSize } },
    series: [{ 
      type: 'bar', 
      data: chartDataFund.value.map(d => d.value), 
      itemStyle: { color: colors[0], borderRadius: [4, 4, 0, 0] }, 
      label: { ...barLabelStyle, fontSize: labelFontSize },
      barWidth: '50%'
    }]
  })

  // 2. 项目阶段
  renderChart('chart-stage', {
    tooltip: { trigger: 'item', textStyle: { fontSize: tooltipFontSize } },
    series: [{
      type: 'funnel',
      left: '10%', top: 20, bottom: 20, width: '80%',
      min: 0, max: Math.max(...chartDataStage.value.map(d => d.value)) + 2,
      label: { fontSize: labelFontSize, fontWeight: 'bold' },
      data: chartDataStage.value.sort((a, b) => b.value - a.value)
    }]
  })

  // 3. 965大类
  renderChart('chart-965cat', {
    tooltip: { trigger: 'item', textStyle: { fontSize: tooltipFontSize } },
    legend: { bottom: '0', left: 'center', textStyle: { fontSize: labelFontSize }, itemWidth: 12, itemHeight: 12 },
    series: [{
      type: 'pie',
      radius: ['45%', '70%'],
      avoidLabelOverlap: false,
      itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
      label: { show: false },
      emphasis: { label: { show: true, fontSize: labelFontSize + 2, fontWeight: 'bold' } },
      data: chartData965Cat.value
    }]
  })

  // 4. 965产业方向 Top
  renderChart('chart-965dir', {
    tooltip: { trigger: 'axis', textStyle: { fontSize: tooltipFontSize } },
    grid: { left: '3%', right: '12%', bottom: '3%', containLabel: true },
    xAxis: { type: 'value', axisLabel: { fontSize: labelFontSize } },
    yAxis: { 
      type: 'category', 
      data: chartData965Dir.value.map(d => d[0]), 
      axisLabel: { 
        fontSize: labelFontSize,
        formatter: (value) => value.length > 8 ? value.slice(0, 7) + '...' : value
      } 
    },
    series: [{ 
      type: 'bar', 
      data: chartData965Dir.value.map(d => d[1]), 
      itemStyle: { color: colors[2], borderRadius: [0, 4, 4, 0] }, 
      label: { show: true, position: 'right', fontSize: labelFontSize, fontWeight: 'bold' } 
    }]
  })

  // 5. 年月趋势
  renderChart('chart-year', {
    tooltip: { trigger: 'axis', textStyle: { fontSize: tooltipFontSize } },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { 
      type: 'category', 
      data: chartDataYear.value.periods, 
      axisLabel: { fontSize: labelFontSize - 2, rotate: 30 } 
    },
    yAxis: { type: 'value', axisLabel: { fontSize: labelFontSize } },
    series: [{ 
      type: 'line', 
      data: chartDataYear.value.values, 
      smooth: true, 
      areaStyle: { opacity: 0.1 }, 
      itemStyle: { color: colors[3] },
      symbolSize: 8,
      label: { show: true, fontSize: labelFontSize - 1 }
    }]
  })

  // 6. 来源分布
  renderChart('chart-source', {
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)', textStyle: { fontSize: tooltipFontSize } },
    legend: { bottom: 0, left: 'center', type: 'scroll', textStyle: { fontSize: labelFontSize - 1 }, itemWidth: 12, itemHeight: 12 },
    series: [{ 
      type: 'pie', 
      radius: ['42%', '66%'],
      center: ['50%', '44%'],
      avoidLabelOverlap: true,
      data: chartDataSourceSummary.value, 
      label: {
        show: true,
        formatter: (params) => params.percent >= 8 ? `${params.name}: ${params.value}` : '',
        fontSize: labelFontSize - 1,
        fontWeight: 'bold'
      },
      labelLine: { show: true, length: 10, length2: 8 }
    }]
  })
}

const initInvestedCharts = () => {
  charts.forEach(c => c.dispose())
  charts = []

  const colors = ['#1e3a8a', '#2563eb', '#0f766e', '#7c3aed', '#ea580c', '#dc2626']
  const labelStyle = { fontSize: 12, fontWeight: 'bold' }

  renderChart('chart-invested-fund', {
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '16%', containLabel: true },
    xAxis: { type: 'category', data: investedChartDataFund.value.map(item => item.name), axisLabel: { interval: 0, rotate: 20, fontSize: 11 } },
    yAxis: { type: 'value' },
    series: [{
      type: 'bar',
      data: investedChartDataFund.value.map(item => item.value),
      itemStyle: { color: colors[0], borderRadius: [4, 4, 0, 0] },
      label: { show: true, position: 'top', ...labelStyle }
    }]
  })

  renderChart('chart-invested-industry', {
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { bottom: 0, left: 'center', type: 'scroll', itemWidth: 12, itemHeight: 12, textStyle: { fontSize: 11 } },
    series: [{
      type: 'pie',
      radius: ['42%', '66%'],
      center: ['50%', '43%'],
      avoidLabelOverlap: true,
      itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
      label: { formatter: (params) => params.percent >= 8 ? `${params.name}: ${params.value}` : '', fontSize: 11 },
      data: investedChartDataIndustry.value
    }]
  })

  renderChart('chart-invested-valuation', {
    tooltip: { trigger: 'axis', formatter: (params) => `${params[0].name}: ${formatWanAmount(params[0].value)}` },
    grid: { left: '3%', right: '16%', bottom: '10%', containLabel: true },
    xAxis: {
      type: 'value',
      splitNumber: 3,
      axisLabel: {
        hideOverlap: true,
        margin: 10,
        fontSize: 10,
        formatter: (value) => {
          if (Math.abs(value) >= 10000) return `${Number((value / 10000).toFixed(1))}亿`
          return `${Number(value.toFixed(0))}万`
        }
      }
    },
    yAxis: { type: 'category', data: investedChartDataValuationTop.value.map(item => item.name), axisLabel: { fontSize: 11, formatter: (value) => value.length > 8 ? `${value.slice(0, 8)}...` : value } },
    series: [{
      type: 'bar',
      data: investedChartDataValuationTop.value.map(item => item.value),
      itemStyle: { color: (params) => params.value >= 0 ? '#16a34a' : '#dc2626', borderRadius: [0, 4, 4, 0] },
      label: { show: true, position: 'right', formatter: (params) => formatWanAmount(params.value), fontSize: 11 }
    }]
  })

  renderChart('chart-invested-talent', {
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '14%', bottom: '10%', containLabel: true },
    xAxis: {
      type: 'value',
      splitNumber: 3,
      minInterval: 1,
      axisLabel: { hideOverlap: true, margin: 10, fontSize: 10 }
    },
    yAxis: { type: 'category', data: investedChartDataTalentTop.value.map(item => item.name), axisLabel: { fontSize: 11, formatter: (value) => value.length > 8 ? `${value.slice(0, 8)}...` : value } },
    series: [{
      type: 'bar',
      data: investedChartDataTalentTop.value.map(item => item.value),
      itemStyle: { color: colors[3], borderRadius: [0, 4, 4, 0] },
      label: { show: true, position: 'right', ...labelStyle }
    }]
  })
}

const initZoomChart = () => {
  if (!enlargedChart.value) return
  const id = enlargedChart.value.id
  const targetId = 'chart-zoom'
  const colors = ['#1e3a8a', '#3b82f6', '#8b5cf6', '#06b6d4', '#f59e0b', '#ef4444', '#10b981']
  
  // 基础样式配置
  const baseLabelFontSize = 16
  const baseAxisFontSize = 16
  const baseTooltipStyle = { textStyle: { fontSize: 16 } }

  let option = {}

  if (id === 'chart-fund') {
    option = {
      tooltip: baseTooltipStyle,
      grid: { left: '5%', right: '5%', bottom: '12%', containLabel: true },
      xAxis: { 
        type: 'category', 
        data: chartDataFund.value.map(d => d.name), 
        axisLabel: { interval: 0, rotate: 10, fontSize: baseAxisFontSize, fontWeight: 'bold' } 
      },
      yAxis: { type: 'value', axisLabel: { fontSize: baseAxisFontSize } },
      series: [{ 
        type: 'bar', 
        data: chartDataFund.value.map(d => d.value), 
        itemStyle: { color: colors[0], borderRadius: [8, 8, 0, 0] }, 
        label: { show: true, position: 'top', fontSize: baseLabelFontSize + 2, fontWeight: 'bold' },
        barWidth: '40%'
      }]
    }
  } else if (id === 'chart-stage') {
    option = {
      tooltip: { trigger: 'item', ...baseTooltipStyle },
      series: [{
        type: 'funnel',
        left: '15%', top: 60, bottom: 60, width: '70%',
        min: 0, max: Math.max(...chartDataStage.value.map(d => d.value)) + 2,
        label: { fontSize: baseLabelFontSize, fontWeight: 'bold' },
        data: chartDataStage.value.sort((a, b) => b.value - a.value)
      }]
    }
  } else if (id === 'chart-965cat') {
    option = {
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)', ...baseTooltipStyle },
      legend: { bottom: '5%', left: 'center', itemStyle: { itemWidth: 24, itemHeight: 24 }, textStyle: { fontSize: baseLabelFontSize } },
      series: [{
        type: 'pie',
        radius: ['45%', '75%'],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
        label: { show: true, formatter: '{b}: {c}', fontSize: baseLabelFontSize, fontWeight: 'bold' },
        emphasis: { label: { show: true, fontSize: baseLabelFontSize + 12, fontWeight: 'bold' } },
        data: chartData965Cat.value
      }]
    }
  } else if (id === 'chart-965dir') {
    option = {
      tooltip: { trigger: 'axis', ...baseTooltipStyle },
      grid: { left: '5%', right: '12%', bottom: '5%', containLabel: true },
      xAxis: { type: 'value', axisLabel: { fontSize: baseAxisFontSize } },
      yAxis: { 
        type: 'category', 
        data: chartData965Dir.value.map(d => d[0]), 
        axisLabel: { 
          fontSize: baseAxisFontSize, 
          fontWeight: 'bold',
          formatter: (value) => value.length > 12 ? value.slice(0, 11) + '...' : value
        } 
      },
      series: [{ 
        type: 'bar', 
        data: chartData965Dir.value.map(d => d[1]), 
        itemStyle: { color: colors[2], borderRadius: [0, 8, 8, 0] }, 
        label: { show: true, position: 'right', fontSize: baseLabelFontSize, fontWeight: 'bold' } 
      }]
    }
  } else if (id === 'chart-year') {
    option = {
      tooltip: { trigger: 'axis', ...baseTooltipStyle },
      grid: { left: '5%', right: '5%', bottom: '12%', containLabel: true },
      xAxis: { type: 'category', data: chartDataYear.value.periods, axisLabel: { fontSize: baseAxisFontSize - 2, rotate: 30 } },
      yAxis: { type: 'value', axisLabel: { fontSize: baseAxisFontSize } },
      series: [{ 
        type: 'line', 
        data: chartDataYear.value.values, 
        smooth: true, 
        areaStyle: { opacity: 0.15 }, 
        itemStyle: { color: colors[3] },
        symbolSize: 12,
        label: { show: true, fontSize: baseLabelFontSize - 2, fontWeight: 'bold' }
      }]
    }
  } else if (id === 'chart-source') {
    option = {
      tooltip: { trigger: 'item', ...baseTooltipStyle },
      legend: { bottom: '5%', left: 'center', type: 'scroll', textStyle: { fontSize: baseLabelFontSize } },
      series: [{ 
        type: 'pie', 
        radius: ['42%', '72%'],
        center: ['50%', '45%'],
        data: chartDataSourceSummary.value, 
        label: { show: true, formatter: '{b}: {c} ({d}%)', fontSize: baseLabelFontSize, fontWeight: 'bold' } 
      }]
    }
  }

  // 确保 DOM 稳定后再初始化
  setTimeout(() => {
    const el = document.getElementById(targetId)
    if (!el) return
    const oldChart = echarts.getInstanceByDom(el)
    if (oldChart) oldChart.dispose()
    const chart = echarts.init(el)
    chart.setOption(option)
    
    // 监听缩放变化
    const ro = new ResizeObserver(() => {
      chart.resize()
    })
    ro.observe(el)
    
    charts.push(chart)
  }, 300)
}

const renderChart = (id, option) => {
  const el = document.getElementById(id)
  if (!el) return
  const chart = echarts.init(el)
  chart.setOption(option)
  charts.push(chart)
}

// 导出 CSV
const exportFilteredData = () => exportData(false)

const exportData = (all = false) => {
  const list = all ? projects.value : filteredProjects.value
  if (!list.length) return ElMessage.warning('没有可导出的数据')

  let csvContent = '\uFEFF' + coreExportHeaders.join(',') + '\n'
  list.forEach(item => {
    const row = coreExportKeys.map(k => {
      let val = item[k] || ''
      if (k === 'year') val = formatCollectMonthCN(val)
      if (k === 'fund') {
        const funds = parseFundNames(val)
        val = funds.join('、')
      }
      if (typeof val === 'string' && (val.includes(',') || val.includes('\n'))) {
        val = `"${val.replace(/"/g, '""')}"`
      }
      return val
    })
    csvContent += row.join(',') + '\n'
  })

  // 生成文件名
  let filename = all ? '项目库全部项目' : '项目库筛选结果'
  if (!all) {
    if (filters.fund) filename += `_${filters.fund}`
    if (filters.industry965Category) filename += `_${filters.industry965Category}`
    if (filters.collectMonthStart || filters.collectMonthEnd) {
      const sStr = formatCollectMonthCN(filters.collectMonthStart) || '开始'
      const eStr = formatCollectMonthCN(filters.collectMonthEnd) || '结束'
      filename += `_${sStr}至${eStr}`
    }
  }
  filename += `_${new Date().toISOString().split('T')[0]}.csv`

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

const exportInvestedData = () => {
  const list = investedProjects.value
  if (!list.length) return ElMessage.warning('没有可导出的已投项目资料')

  let csvContent = '\uFEFF' + exportHeaders.join(',') + '\n'
  list.forEach(item => {
    const row = exportKeys.map(k => {
      let val = item[k] || ''
      if (['year', 'investmentDate', 'valuationUpdateDate'].includes(k)) val = formatCollectMonthCN(val) || val
      if (k === 'closingDate') val = formatDateCN(val) || val
      if (k === 'valuationChangeAmount') val = formatValuationChangeAmount(item)
      if (k === 'valuationChangeRatio') val = formatValuationChangeRatio(item)
      if (k === 'fund') val = parseFundNames(val).join('、')
      if (typeof val === 'string' && (val.includes(',') || val.includes('\n'))) {
        val = `"${val.replace(/"/g, '""')}"`
      }
      return val
    })
    csvContent += row.join(',') + '\n'
  })

  const filename = `已投项目资料_${new Date().toISOString().split('T')[0]}.csv`
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

const downloadTemplate = () => {
  let csvContent = '\uFEFF' + coreExportHeaders.join(',') + '\n'
  csvContent += '示例项目,XX企业,XX一号基金,储备项目,否,自主挖掘,2025年1月,成长投,无,人工智能,6大战略性新兴产业,人工智能,视觉,XX市,A轮,5000万,张三,中,进展良好,无'

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = '项目导入模板.csv'
  link.click()
}

const triggerImport = () => {
  fileInput.value.click()
}

const waitForUi = () => new Promise(resolve => setTimeout(resolve, 0))

const cleanHeaderCell = (value) => {
  return String(value || '')
    .replace(/^\uFEFF/, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/^"|"$/g, '')
    .trim()
}

const splitCSVRow = (row, sep) => {
  const result = []
  let cell = '', inQuotes = false, atFieldStart = true
  for (let i = 0; i < row.length; i++) {
    const char = row[i]
    const nextChar = row[i + 1]

    if (char === '"' && atFieldStart) {
      inQuotes = true
      atFieldStart = false
      continue
    }

    if (char === '"' && inQuotes) {
      if (nextChar === '"') {
        cell += '"'
        i++
      } else {
        inQuotes = false
      }
      continue
    }

    if (char === sep && !inQuotes) {
      result.push(cell.trim())
      cell = ''
      atFieldStart = true
    } else {
      cell += char
      if (char.trim()) atFieldStart = false
    }
  }
  result.push(cell.trim())
  return result
}

const detectDelimiter = (row) => {
  const candidates = [',', '\t', ';', '，']
  return candidates
    .map(sep => ({ sep, count: splitCSVRow(row, sep).length }))
    .sort((a, b) => b.count - a.count)[0]?.sep || ','
}

const isProjectNameHeader = (header) => {
  const cleanH = cleanHeaderCell(header).toLowerCase().replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '')
  if (!cleanH) return false
  if (cleanH.includes('项目来源') || cleanH.includes('项目类型') || cleanH.includes('项目负责人')) return false
  return cleanH.includes('项目名称') || cleanH.includes('项目名') || cleanH === '项目' || cleanH.includes('project') || cleanH.includes('name')
}

const buildImportHeaderMap = (headers) => {
  const keysMap = {
    '项目名称': 'name', '企业名称': 'company', '所属基金': 'fund', '当前阶段': 'stage',
    '重点推进': 'isKey', '项目来源': 'source', '来源': 'source',
    '收集年月': 'year', '收集年份': 'year', '年份': 'year', '日期': 'year', '收集日期': 'year',
    '项目类型': 'type',
    '原始行业': 'originalIndustry', '系统标准行业': 'standardIndustry',
    '965大类': 'industry965Category', '965产业方向': 'industry965Direction',
    '细分领域': 'subField', '注册地': 'location', '融资轮次': 'round',
    '本轮融资金额': 'amount', '项目负责人': 'manager', '进展': 'progress', '备注': 'remark',
    '投资金额': 'investmentAmount', '持股比例': 'shareholdingRatio', '投资时间': 'investmentDate',
    '交割时间': 'closingDate', '初始投后估值': 'initialPostValuation', '最新估值': 'latestValuation',
    '估值变化金额': 'valuationChangeAmount', '估值变化比例': 'valuationChangeRatio', '估值更新时间': 'valuationUpdateDate',
    '服务人才数量': 'servedTalentCount', '企业员工总数': 'employeeCount', '科研人员数量': 'researcherCount',
    '高层次人才数量': 'highLevelTalentCount', '博士人数': 'doctorCount', '硕士人数': 'masterCount',
    '办公地': 'officeLocation', '是否在汉注册': 'registeredInWuhan', '是否在汉纳税': 'taxedInWuhan',
    '最新经营进展': 'latestOperationProgress', '投后服务事项': 'postInvestmentServices',
    '风险情况': 'riskStatus', '下一步计划': 'nextPlan', '最近更新时间': 'postLastUpdateDate'
  }

  return headers.map(h => {
    if (!h) return null
    const cleanH = cleanHeaderCell(h).replace(/\s/g, '')
    if (cleanH === '项目来源') return 'source'
    for (const [search, key] of Object.entries(keysMap)) {
      if (search === '来源') continue
      if (cleanH.includes(search)) return key
    }
    if (cleanH === '来源') return 'source'
    return null
  })
}

const findImportHeaderLine = (text) => {
  let pos = 0
  while (pos < text.length) {
    let nextPos = text.indexOf('\n', pos)
    if (nextPos === -1) nextPos = text.length
    const rawLine = text.slice(pos, nextPos)
    const cleanLine = rawLine.trim()
    const cleanHeaderText = cleanLine.replace(/\s/g, '')
    const startsNext = nextPos < text.length ? nextPos + 1 : text.length

    if (!cleanLine || /^sep\s*=/i.test(cleanLine)) {
      pos = startsNext
      continue
    }

    const delimiter = detectDelimiter(cleanLine)
    const headers = splitCSVRow(cleanLine, delimiter)
    if (headers.some(isProjectNameHeader) || cleanHeaderText.includes('项目名称') || /(^|[,;\t，])\s*(name|project)\s*([,;\t，]|$)/i.test(cleanLine)) {
      return { row: cleanLine, dataStart: startsNext }
    }

    pos = startsNext
  }
  return null
}

const isImportDataRow = (values, nameIdx) => {
  const name = String(values[nameIdx] || '').trim()
  if (!name) return false

  const cleanName = name.replace(/\s/g, '')
  if (isProjectNameHeader(name)) return false
  if (/^(合计|总计|统计|小计|备注|说明|注[:：]?|数据来源|序号)$/i.test(cleanName)) return false

  return true
}

const parseImportRowsInBatches = async ({ text, dataStart, delimiter, headerToKey, nameIdx, currentMaxId }) => {
  const items = []
  const totalLines = Math.max(1, (text.match(/\n/g) || []).length)
  let physicalLines = 0
  let parsedRecords = 0
  let importedRows = 0
  let batchCount = 0
  let record = ''
  let inQuotes = false
  let atFieldStart = true

  const consumeRecord = (rawRecord) => {
    const rawRow = rawRecord.trim()
    if (!rawRow) return

    const values = splitCSVRow(rawRow, delimiter)
    if (isImportDataRow(values, nameIdx)) {
      const item = { id: currentMaxId + importedRows + 1 }
      headerToKey.forEach((key, valIdx) => {
        if (key && (item[key] === undefined || item[key] === '')) item[key] = values[valIdx] || ''
      })
      items.push(item)
      importedRows++
    }
    parsedRecords++
  }

  for (let i = dataStart; i < text.length; i++) {
    const char = text[i]
    const nextChar = text[i + 1]

    if (char === '"' && atFieldStart) {
      inQuotes = true
      atFieldStart = false
      record += char
      continue
    }

    if (char === '"' && inQuotes) {
      if (nextChar === '"') {
        record += char + nextChar
        i++
        continue
      }
      inQuotes = false
      record += char
      continue
    }

    if (char === '\n') physicalLines++

    if (char === '\n' && !inQuotes) {
      consumeRecord(record)
      record = ''
      atFieldStart = true
      batchCount++
    } else {
      record += char
      if (char === delimiter && !inQuotes) atFieldStart = true
      else if (char.trim()) atFieldStart = false
    }

    if (batchCount >= 500) {
      loadingText.value = `正在解析数据... 已识别 ${parsedRecords} 条记录，扫描 ${Math.min(physicalLines, totalLines)} / ${totalLines} 行`
      batchCount = 0
      await waitForUi()
    }
  }

  if (record.trim()) consumeRecord(record)

  return items
}

const handleFileUpload = async (event) => {
  const file = event.target.files[0]
  if (!file) return
  
  isLoading.value = true;
  loadingText.value = '正在读取文件...';
  
  const reader = new FileReader()
  reader.onload = async (e) => {
    try {
      const buffer = e.target.result
      const decoder = new TextDecoder('utf-8')
      let text = decoder.decode(buffer)
      
      if (!text.includes('项目') && !text.includes('Name') && !text.includes('company')) {
        try {
          text = new TextDecoder('gbk').decode(buffer)
        } catch (err) {}
      }

      if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1)
      text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
      if (!text.trim()) {
        isLoading.value = false;
        return ElMessage.error('CSV文件内容缺失')
      }

      await waitForUi()
      loadingText.value = '正在识别表头...'

      const headerLine = findImportHeaderLine(text)
      if (!headerLine) {
        isLoading.value = false;
        const preview = text.split('\n').map(line => line.trim()).filter(Boolean).slice(0, 3).join(' / ')
        return ElMessageBox.alert(`未能找到“项目名称”表头。系统实际读到的前几行是：${preview || '空内容'}`, 'CSV 表头识别失败', {
          confirmButtonText: '知道了',
          type: 'warning'
        })
      }

      const firstRow = headerLine.row
      const delimiter = detectDelimiter(firstRow)

      const headers = splitCSVRow(firstRow, delimiter)

      const nameIdx = headers.findIndex(isProjectNameHeader)
      if (nameIdx === -1) {
        isLoading.value = false;
        return ElMessageBox.alert(`已找到疑似表头行，但未能定位“项目名称”列。当前表头为：${headers.map(cleanHeaderCell).join('、')}`, 'CSV 表头识别失败', {
          confirmButtonText: '知道了',
          type: 'warning'
        })
      }

      const headerToKey = buildImportHeaderMap(headers)
      const currentMaxId = projects.value.length ? Math.max(...projects.value.map(p => p.id || 0)) : 0
      const rawNewItems = await parseImportRowsInBatches({ text, dataStart: headerLine.dataStart, delimiter, headerToKey, nameIdx, currentMaxId })

      if (rawNewItems.length) {
        loadingText.value = '正在写入项目库...'
        await waitForUi()
        projects.value = await processProjectsInBatches([...toRaw(projects.value), ...rawNewItems])
        await waitForUi()
        loadingText.value = '正在保存数据...'
        saveToLocal()
        ElMessage.success(`导入完成：本次导入 ${rawNewItems.length} 条，当前项目总数 ${projects.value.length} 条。`)
      } else {
        ElMessage.warning('未能识别到有效项目数据。')
      }
    } catch (err) {
      console.error('Import failed:', err)
      ElMessage.error('导入失败，请检查 CSV 文件格式')
    } finally {
      isLoading.value = false;
      event.target.value = ''
    }
  }
  reader.onerror = () => {
    isLoading.value = false
    event.target.value = ''
    ElMessage.error('读取文件失败')
  }
  reader.readAsArrayBuffer(file)
}

// 系统维护功能
const resetToMock = () => {
  ElMessageBox.confirm('重置将清空当前所有修改并恢复初始示例数据，确定吗？', '提示', { type: 'warning' })
    .then(() => {
      projects.value = processProjects([...mockData])
      saveToLocal()
      ElMessage.success('已恢复示例数据')
    })
}

const clearAllData = () => {
  ElMessageBox.confirm('此操作将永久清空所有项目数据且无法撤销，确定吗？', '严重警告', { type: 'error' })
    .then(() => {
      projects.value = []
      saveToLocal()
      ElMessage.success('数据已清空')
    })
}

// 生命周期
onMounted(() => {
  loadDictionarySettings()
  loadData()
  checkMobile()
  if (activeMenu.value === 'overview') {
    nextTick(() => initCharts())
  } else if (activeMenu.value === 'invested') {
    nextTick(() => initInvestedCharts())
  }
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  charts.forEach(c => c.dispose())
})

const checkMobile = () => {
  isMobile.value = window.innerWidth <= 768
}

const handleResize = () => {
  checkMobile()
  charts.forEach(c => c.resize())
}

// 监听数据变化刷新图表
watch(projects, () => {
  if (activeMenu.value === 'overview') {
    nextTick(() => initCharts())
  } else if (activeMenu.value === 'invested') {
    nextTick(() => initInvestedCharts())
  }
}, { deep: true })

watch(investedProjects, (list) => {
  if (!list.length) {
    selectedInvestedProjectId.value = null
    return
  }
  if (!list.some(item => item.id === selectedInvestedProjectId.value)) {
    selectedInvestedProjectId.value = list[0].id
  }
  if (activeMenu.value === 'invested') {
    nextTick(() => initInvestedCharts())
  }
}, { immediate: true })

</script>

<style scoped>
* {
  box-sizing: border-box;
}

html, body, #app {
  width: 100%;
  min-height: 100%;
  overflow-x: hidden;
}

.dialog-body {
  max-height: 70vh;
  overflow-y: auto;
  padding: 10px 20px;
}

@media (max-width: 768px) {
  .dialog-body {
    padding: 10px;
  }
}

.dialog-footer {
  padding: 10px 0;
  border-top: 1px solid #f3f4f6;
}

.layout-container {
  height: 100vh;
  display: flex;
}

.main-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.aside {
  background-color: #001529;
  color: #fff;
  transition: width 0.3s ease-in-out !important;
  box-shadow: 2px 0 8px 0 rgba(29, 35, 41, 0.05);
  z-index: 1001;
}

.mobile-sidebar {
  position: fixed;
  left: 0;
  top: 0;
  height: 100vh;
  transform: translateX(-100%);
  z-index: 2000;
}

.mobile-open {
  transform: translateX(0);
}

.mobile-mask {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 1999;
}

.logo {
  height: 64px;
  display: flex;
  align-items: center;
  padding: 0 16px;
  gap: 12px;
  background-color: #002140;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
  white-space: nowrap;
}

.logo-title {
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.5px;
  white-space: nowrap;
  line-height: 1.4;
  color: #fff;
  flex: 1;
}

.collapse-btn {
  height: 40px;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background-color: #002140;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  transition: all 0.3s;
}

.collapse-btn:hover {
  background-color: #003366;
}

.io-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;
  align-items: stretch;
}

@media (max-width: 768px) {
  .io-grid {
    grid-template-columns: 1fr;
  }
}

.io-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 300px;
  border-radius: 8px;
}

.io-card :deep(.el-card__header) {
  padding: 18px 22px;
}

.io-card :deep(.el-card__body) {
  flex: 1;
  display: flex;
}

.io-card-header {
  font-size: 18px;
  font-weight: 700;
  color: #1f2937;
}

.io-card-header-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.io-card-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #1e3a8a;
  background: #eff6ff;
  flex: 0 0 auto;
}

.io-card-icon.success {
  color: #047857;
  background: #ecfdf5;
}

.io-card-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding: 34px 24px 28px;
  min-height: 220px;
  text-align: center;
  width: 100%;
}

.io-description {
  color: #6b7280;
  font-size: 14px;
  margin: 0;
  line-height: 1.6;
  max-width: 280px;
}

.io-action-area {
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.io-meta-text {
  min-height: 24px;
  color: #64748b;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dictionary-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.dictionary-fund-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.editable-fund-tag {
  height: auto;
  min-height: 32px;
  padding: 4px 4px 4px 10px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: 100%;
}

.editable-fund-tag span {
  white-space: normal;
  line-height: 1.4;
}

.fund-selector-stack {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.fund-selector-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.fund-select {
  flex: 1;
}

.selected-fund-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  min-height: 24px;
}

.el-menu-vertical {
  border-right: none;
}

.header {
  background-color: #fff;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  height: 64px;
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .header {
    padding: 0 12px;
  }
  .header-right {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 4px;
    font-size: 10px;
  }
  .update-time {
    margin-right: 0 !important;
    font-size: 10px;
  }
  .total-count {
    display: none;
  }
}

.title {
  margin: 0;
  font-size: 20px;
  color: #1f2937;
  font-weight: 600;
}

@media (max-width: 768px) {
  .title {
    font-size: 16px;
  }
}

.main-content {
  background-color: #f5f7fb;
  padding: 24px;
  overflow-y: auto;
}

@media (max-width: 768px) {
  .main-content {
    padding: 12px;
  }
}

.stat-card {
  border: none;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
  transition: all 0.3s;
}

@media (max-width: 768px) {
  .stat-card {
    margin-bottom: 8px;
  }
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

.stat-label {
  color: #64748b;
  font-size: 14px;
  margin-bottom: 12px;
  font-weight: 500;
}

@media (max-width: 768px) {
  .stat-label {
    font-size: 12px;
    margin-bottom: 6px;
  }
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  font-family: 'JetBrains Mono', 'Public Sans', sans-serif;
}

@media (max-width: 768px) {
  .stat-value {
    font-size: 20px;
  }
}

.chart-container-mini {
  height: 280px;
  width: 100%;
}

@media (max-width: 768px) {
  .chart-container-mini {
    height: 300px;
  }
}

.filter-container {
  padding: 16px 20px;
}

@media (max-width: 768px) {
  .mobile-full {
    width: 100% !important;
    margin-right: 0 !important;
    margin-bottom: 12px !important;
  }

  .mobile-half {
    width: calc(50% - 8px) !important;
    margin-right: 8px !important;
    margin-bottom: 12px !important;
  }

  .mobile-full-input {
    width: 100% !important;
  }
  
  .filter-actions {
    width: 100%;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: center;
    margin-top: 8px;
  }

  .filter-actions .el-button {
    flex: 1;
    min-width: 120px;
    margin-left: 0 !important;
  }
}

.filter-actions {
  display: flex;
  align-items: center;
}

.table-wrapper {
  width: 100%;
  overflow-x: auto;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
  overflow-x: auto;
}

.invested-stat-card {
  text-align: center;
  border-color: #e2e8f0;
  background: #ffffff;
}

.invested-stat-value {
  font-size: 20px;
  line-height: 1.2;
  font-weight: 800;
  font-family: 'JetBrains Mono', 'Public Sans', sans-serif;
}

.invested-chart-container {
  width: 100%;
  height: 260px;
}

.invested-layout {
  display: grid;
  grid-template-columns: minmax(300px, 380px) minmax(0, 1fr);
  gap: 20px;
  align-items: start;
}

.invested-list-card,
.invested-detail-card {
  border-radius: 8px;
}

.invested-card-header,
.invested-detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.invested-project-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: calc(100vh - 355px);
  overflow-y: auto;
  padding-right: 4px;
}

.invested-project-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}

.invested-project-item {
  width: 100%;
  border: 1px solid #e5e7eb;
  background: #fff;
  border-radius: 8px;
  padding: 12px;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
}

.invested-project-item:hover,
.invested-project-item.active {
  border-color: #2563eb;
  background: #eff6ff;
}

.invested-project-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}

.invested-project-name {
  min-width: 0;
  color: #111827;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.4;
}

.invested-project-sub {
  color: #4b5563;
  font-size: 13px;
  line-height: 1.5;
  margin-bottom: 8px;
}

.invested-project-meta {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: #64748b;
  font-size: 12px;
  line-height: 1.5;
}

.invested-detail-title {
  color: #111827;
  font-size: 20px;
  font-weight: 800;
  line-height: 1.4;
}

.invested-detail-company {
  color: #64748b;
  font-size: 13px;
  margin-top: 4px;
}

.invested-detail-actions {
  flex: 0 0 auto;
}

.invested-detail-section-title {
  margin: 18px 0 10px;
  color: #1f2937;
  font-size: 15px;
  font-weight: 800;
}

.valuation-change {
  color: #64748b;
  font-weight: 700;
}

.valuation-change.up {
  color: #16a34a;
}

.valuation-change.down {
  color: #dc2626;
}

.valuation-change.neutral {
  color: #64748b;
}

.invested-section {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f8fafc;
  padding: 16px;
  margin-top: 14px;
}

.invested-section-title {
  color: #1f2937;
  font-size: 14px;
  font-weight: 700;
  margin-bottom: 8px;
}

.invested-section-content {
  color: #374151;
  font-size: 14px;
  line-height: 1.8;
  white-space: pre-wrap;
}

@media (max-width: 900px) {
  .invested-layout {
    grid-template-columns: 1fr;
  }

  .invested-project-list {
    max-height: none;
  }
}

.fade-in {
  animation: fadeIn 0.5s ease-in-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.mr-4 { margin-right: 1rem; }
.mb-4 { margin-bottom: 1rem; }
.mb-6 { margin-bottom: 1.5rem; }
.mt-4 { margin-top: 1rem; }
.mt-1 { margin-top: 0.25rem; }
.p-4 { padding: 1rem; }
.hidden { display: none; }
.w-full { width: 100%; }
.text-center { text-align: center; }
.text-gray-500 { color: #6b7280; }
.text-gray-600 { color: #4b5563; }
.font-bold { font-weight: bold; }
.font-medium { font-weight: 500; }
.flex { display: flex; }
.flex-wrap { flex-wrap: wrap; }
.gap-2 { gap: 0.5rem; }
.h-full { height: 100%; }
.indent-8 {
  text-indent: 2em;
}
</style>
